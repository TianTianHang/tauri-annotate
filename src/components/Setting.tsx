// --- Settings Component ---
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { homeDir } from "@tauri-apps/api/path";
import { useEffect, useState } from "react";

function Settings({ onApply }: { onApply: () => void }) {
  const [interpreter, setInterpreter] = useState('');
  const [script, setScript] = useState('');
  const [status, setStatus] = useState('Python process not running.');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    invoke('load_py_config')
      .then((config: any) => {
        if (config.interpreter) setInterpreter(config.interpreter);
        if (config.script) setScript(config.script);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleBrowseInterpreter = async () => {
    const selected = await open({
      multiple: false,
      defaultPath: await homeDir(),
    });
    if (typeof selected === 'string') {
      setInterpreter(selected);
    }
  };

  const handleBrowseScript = async () => {
    const selected = await open({
      multiple: false,
      defaultPath: await homeDir(),
      filters: [{ name: 'Python Scripts', extensions: ['py'] }],
    });
    if (typeof selected === 'string') {
      setScript(selected);
    }
  };

  const handleApply = async () => {
    if (!interpreter || !script) {
      alert("Please select both a Python interpreter and a script.");
      return;
    }
    setStatus('Restarting Python process...');
    try {
      const config = { interpreter, script };
      await invoke('save_py_config', { config });
      await invoke('restart_python_process', { config });
      setStatus('Python process started successfully.');
      onApply();
    } catch (error) {
      setStatus(`Error: ${error}`);
      console.error(error);
    }
  };

  if (isLoading) {
    return <div className="settings-panel">Loading settings...</div>;
  }

  return (
    <div className="settings-panel">
      <h2>Python Backend Settings</h2>
      <div className="form-group">
        <label htmlFor="interpreter-path">Python Interpreter Path:</label>
        <div className="input-group">
          <input
            id="interpreter-path"
            type="text"
            value={interpreter}
            onChange={(e) => setInterpreter(e.target.value)}
            placeholder="e.g., /usr/bin/python3 or C:\Python39\python.exe"
          />
          <button onClick={handleBrowseInterpreter}>Browse</button>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="script-path">Python Script Path:</label>
        <div className="input-group">
          <input
            id="script-path"
            type="text"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="e.g., /path/to/your/main.py"
          />
          <button onClick={handleBrowseScript}>Browse</button>
        </div>
      </div>
      <button onClick={handleApply} disabled={!interpreter || !script}>
        Save and Start Backend
      </button>
      <p className="status-text">Status: {status}</p>
    </div>
  );
}
export default Settings