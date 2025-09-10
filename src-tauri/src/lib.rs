// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::process::{Child, Command, Stdio, ChildStdin, ChildStdout};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State, Manager};
use std::time::{Duration, Instant};
use tauri::api::path::{app_data_dir};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone)]
struct PyConfig {
    interpreter: Option<String>,
    script: Option<String>,
}

// This state holds the running python process, so we can kill it if needed.
struct PythonChild(Arc<Mutex<Option<Child>>>);

// The state that holds the Python process handles.
// We use a Mutex to ensure that only one thread can access the handles at a time.
pub struct PythonProcess {
    stdin: Mutex<Option<ChildStdin>>,
    reader: Mutex<Option<BufReader<ChildStdout>>>,
}

// This is the command that the frontend will call.
#[tauri::command]
fn invoke_python(
    command: String,
    params: serde_json::Value,
    state: State<PythonProcess>,
    app: AppHandle,
) -> Result<String, String> {
    let mut stdin_guard = state.stdin.lock().unwrap();
    let mut reader_guard = state.reader.lock().unwrap();

    if let (Some(stdin), Some(reader)) = (stdin_guard.as_mut(), reader_guard.as_mut()) {
        // Prepare the JSON command string to send to Python.
        let json_command = serde_json::json!({
            "command": command,
            "params": params
        });
        // Append a newline character because Python's `readline()` waits for it.
        let command_str = format!("{}\n", json_command.to_string());

        stdin
            .write_all(command_str.as_bytes())
            .map_err(|e| e.to_string())?;
        stdin.flush().map_err(|e| e.to_string())?;

        let timeout = Duration::from_secs(5);
        let start_time = Instant::now();
        const RPC_PREFIX: &str = "__JSON_RPC__";
        // 循环读取，直到找到一个带有 __JSON_RPC__ 前缀的有效响应
        loop {
            // 检查是否超时
            if start_time.elapsed() >= timeout {
                return Err("Timeout: Did not receive response from Python in time.".into());
            }
            let mut response_line = String::new();
            let bytes_read = reader
                .read_line(&mut response_line)
                .map_err(|e| e.to_string())?;
            
            // 如果读到0字节，说明Python进程可能已经意外退出
            if bytes_read == 0 {
                return Err("Python process exited unexpectedly.".into());
            }

            
            if let Some(json_payload) = response_line.strip_prefix(RPC_PREFIX) {
                // 找到了有效的响应，移除前缀和末尾的换行符后返回
                return Ok(json_payload.trim_end().to_string());
            } else {
                // This is a log line, emit it to the frontend
                app.emit_all("python-log", format!("[stdout] {}", response_line.trim_end()))
                    .unwrap();
            }
        }
    } else {
        Err("Python process is not running.".into())
    }
}



fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app_data_dir(&app.config())
        .ok_or_else(|| "Failed to get app data directory".to_string())?;
    
    Ok(data_dir.join("py_config.json"))
}

#[tauri::command]
async fn load_py_config(app: AppHandle) -> Result<PyConfig, String> {
    let config_path = get_config_path(&app)?;
    if !config_path.exists() {
        return Ok(PyConfig { interpreter: None, script: None });
    }
    let file = std::fs::File::open(config_path).map_err(|e| e.to_string())?;
    let config = serde_json::from_reader(file).map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
async fn save_py_config(config: PyConfig, app: AppHandle) -> Result<(), String> {
    let config_path = get_config_path(&app)?;
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let file = std::fs::File::create(config_path).map_err(|e| e.to_string())?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, &config).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn restart_python_process(
    config: PyConfig,
    child: State<'_, PythonChild>,
    process_state: State<'_, PythonProcess>,
    app: AppHandle,
) -> Result<(), String> {
    // Kill existing process if any
    if let Some(mut child_process) = child.0.lock().unwrap().take() {
        child_process.kill().map_err(|e| e.to_string())?;
        child_process.wait().map_err(|e| e.to_string())?;
    }

    // Clear old process state
    *process_state.stdin.lock().unwrap() = None;
    *process_state.reader.lock().unwrap() = None;

    let interpreter = config.interpreter.ok_or("Python interpreter path not set")?;
    let script_path_str = config.script.ok_or("Python script path not set")?;
    
    if !std::path::Path::new(&script_path_str).exists() {
        return Err(format!("Script not found at {}", &script_path_str));
    }

    let mut new_child = Command::new(&interpreter)
        .arg("-u")
        .arg(&script_path_str)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Python process with '{}': {}", interpreter, e))?;

    let stderr = new_child.stderr.take().unwrap();
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line_content) = line {
                app_handle.emit_all("python-log", format!("[stderr] {}", line_content)).unwrap();
            }
        }
    });

    *process_state.stdin.lock().unwrap() = new_child.stdin.take();
    *process_state.reader.lock().unwrap() = Some(BufReader::new(new_child.stdout.take().unwrap()));
    *child.0.lock().unwrap() = Some(new_child);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PythonChild(Arc::new(Mutex::new(None))))
        .manage(PythonProcess {
            stdin: Mutex::new(None),
            reader: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            invoke_python,
            load_py_config,
            save_py_config,
            restart_python_process
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
