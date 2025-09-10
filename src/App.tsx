import { useState, useRef, useEffect, MouseEvent, useCallback } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import "./App.css";
import VideoDisplay from "./components/VideoDisplay";
import Settings from "./components/Setting";


// --- Type Definitions ---
// These should match the data structures sent from your Python backend

export interface Bbox {
  id: number;
  box: [number, number, number, number, number, number, number, number]; // [x1_a, y1_a, x2_a, y2_a, x1_b, y1_b, x2_b, y2_b]
  color: string;
}

// New interface for data from a single camera
export interface CamData {
  bboxes: Bbox[];
  image_data: string; // Base64 encoded image string
  frame_number: number;
}

// Updated interface for the whole frame data from backend
export interface FrameData {
  frame_number: number;
  cams: Record<string, CamData>;
}

export interface Point {
  x: number;
  y: number;
}


// --- Main App Component ---

function App() {
  // --- State Management ---
  const [frameData, setFrameData] = useState<FrameData | null>(null);
  const [selectedCamId, setSelectedCamId] = useState<string | null>(null);
  const [pythonReady, setPythonReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  // 【变更】将 currentBbox 重命名为 currentDrawingBox，使其含义更清晰
  const [currentDrawingBox, setCurrentDrawingBox] = useState<[number, number, number, number] | null>(null);
  // 【新增】一个新的状态，用于存储已绘制完成、等待提交的框
  const [manualBboxes, setManualBboxes] = useState<([number, number, number, number])[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [idsToSave, setIdsToSave] = useState<Set<number>>(new Set());
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [allUniquePersonIds, setAllUniquePersonIds] = useState<Set<number>>(new Set());
  const [startFrame, setStartFrame] = useState(1);
  const [endFrame, setEndFrame] = useState(1);
  const [maxFrame, setMaxFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(10);

  // --- Refs for DOM elements ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // --- Derived State ---
  const currentCamData = frameData && selectedCamId ? frameData.cams[selectedCamId] : null;
  const displayFrameData = currentCamData ? { ...currentCamData, frame_number: frameData!.frame_number } : null;

  // --- Backend Interaction ---

  const handleToggleIdForSave = (id: number) => {
    setIdsToSave(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getNextFrame = useCallback(async () => {
    if (!pythonReady) {
      // Maybe show a message to the user to configure the backend first
      console.log("Python backend is not ready. Please configure it in the settings.");
      return;
    }
    try {
      // This is a placeholder. The actual command and parameters will depend on your Rust backend.
      const responseStr = await invoke<string>("invoke_python", {
        command: "process_frame",
        params: {},
      });
      const response: FrameData = JSON.parse(responseStr);
      setFrameData(response);

      // Update unique person IDs from all cameras
      setAllUniquePersonIds(prev => {
          const newSet = new Set(prev);
          Object.values(response.cams).forEach(cam => {
            cam.bboxes.forEach(bbox => newSet.add(bbox.id));
          });
          return newSet;
      });

      // Set selected camera if not set
      if (!selectedCamId && Object.keys(response.cams).length > 0) {
        setSelectedCamId(Object.keys(response.cams)[0]);
      }

      setMaxFrame(prev => Math.max(prev, response.frame_number));
    } catch (error) {
      console.error("Error fetching next frame:", error);
      setIsPlaying(false); // Stop playing on error
      // For demonstration, let's set some mock data on error
      setFrameData(prev => ({
        frame_number: (prev?.frame_number || 0) + 1,
        cams: {
          'cam1': {
            image_data: "data:image/svg+xml,%3Csvg width='640' height='480' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3EFailed to load frame. Click 'Next Frame'.%3C/text%3E%3C/svg%3E",
            bboxes: [
              { id: 1, box: [50, 50, 150, 200, 60, 60, 140, 190], color: 'red' },
              { id: 2, box: [200, 100, 350, 400, 210, 110, 340, 390], color: 'blue' },
            ],
            frame_number: 1
          }
        }
      }));
      if (!selectedCamId) setSelectedCamId('cam1');
    }
  }, [pythonReady, selectedCamId]);

  const getSpecificFrame = useCallback(async (frameNumber: number) => {
    if (!pythonReady) {
      console.log("Python backend is not ready.");
      return;
    }
    try {
      const responseStr = await invoke<string>("invoke_python", {
        command: "process_frame",
        params: { target_frame: frameNumber },
      });
      const response: FrameData = JSON.parse(responseStr);
      setFrameData(response);

      // Update unique person IDs from all cameras
      setAllUniquePersonIds(prev => {
          const newSet = new Set(prev);
          Object.values(response.cams).forEach(cam => {
            cam.bboxes.forEach(bbox => newSet.add(bbox.id));
          });
          return newSet;
      });

      // Ensure a camera is selected
      const camIds = Object.keys(response.cams);
      if (camIds.length > 0 && (!selectedCamId || !camIds.includes(selectedCamId))) {
        setSelectedCamId(camIds[0]);
      } else if (camIds.length === 0) {
        setSelectedCamId(null);
      }

    } catch (error) {
      console.error(`Error fetching frame ${frameNumber}:`, error);
    }
  }, [pythonReady, selectedCamId]);

  async function getPrevFrame() {
    if (!frameData || frameData.frame_number <= 1) {
      console.log("Already at the first frame.");
      return; // 不能跳到第一帧之前
    }
    await getSpecificFrame(frameData.frame_number - 1);
  }

  async function handleLoadVideos() {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: 'Select Video Folder',
      });
  
      if (typeof selectedPath !== 'string') {
        console.log('No folder selected.');
        return;
      }
  
      // Reset state before loading new videos
      setFrameData(null);
      setSelectedCamId(null);
      setAllUniquePersonIds(new Set());
      setMaxFrame(0);
      setStartFrame(1);
      setEndFrame(1);
      setIsPlaying(false);
  
      const responseStr = await invoke<string>('invoke_python', {
        command: 'load_videos',
        params: { video_path: selectedPath },
      });
      const response = JSON.parse(responseStr);
  
      if (response.status === 'success') {
        alert(`Successfully loaded ${Object.keys(response.video_info).length} video(s).`);
        // After loading, automatically fetch the first frame
        await getSpecificFrame(1);
        setPythonReady(true); // Mark as ready since videos are loaded
      } else {
        alert(`Error loading videos: ${response.message}`);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      alert(`An error occurred: ${error}`);
    }
  }

  // 【变更】修改手动提交逻辑
  async function submitManualBbox() {
    // 检查是否已选择相机和ID，并且正好画了两个框
    if (manualBboxes.length !== 2 || selectedPersonId === null || !frameData || !selectedCamId) {
      alert("请先选择一个人物ID，并在图像上画两个框。");
      return;
    }
    setIsPlaying(false); // 暂停播放

    // 将两个框的坐标都进行标准化 [x_min, y_min, x_max, y_max]
    const normalizedBboxes = manualBboxes.map(box => {
      const [x1, y1, x2, y2] = box;
      return [
        Math.round(Math.min(x1, x2)),
        Math.round(Math.min(y1, y2)),
        Math.round(Math.max(x1, x2)),
        Math.round(Math.max(y1, y2)),
      ];
    });

    // 将两个标准化的框合并成一个包含8个数字的数组
    const finalBbox = [...normalizedBboxes[0], ...normalizedBboxes[1]];

    try {
      await invoke("invoke_python", {
        command: "update_bbox",
        params: {
          frame_num: frameData.frame_number,
          cam_id: selectedCamId,
          person_id: selectedPersonId,
          bbox: finalBbox, // 发送合并后的框
        },
      });
      alert(`人物 ${selectedPersonId} 在相机 ${selectedCamId} 上的边界框已提交!`);
      
      // 提交成功后清空手动绘制状态
      setManualBboxes([]);
      setCurrentDrawingBox(null);
      
      setAllUniquePersonIds(prev => {
          const newSet = new Set(prev);
          newSet.add(selectedPersonId);
          return newSet;
      });
      // 重新获取当前帧以显示更新后的数据
      await getSpecificFrame(frameData.frame_number);
    } catch (error) {
      console.error("Error submitting bbox:", error);
      alert(`提交数据时出错: ${error}`);
    }
  }

  async function saveSelectedData() {
    if (idsToSave.size === 0) {
      alert("No persons selected to save.");
      return;
    }
    if (startFrame > endFrame) {
      alert("Start frame cannot be after end frame.");
      return;
    }
    try {
      const response = await invoke<any>("invoke_python", {
        command: "save_selected",
        params: {
          person_ids: Array.from(idsToSave),
          start_frame: startFrame,
          end_frame: endFrame,
        },
      });
      alert(`Data for ${idsToSave.size} person(s) from frame ${startFrame} to ${endFrame} saved to: ${response.path}`);
    } catch (error) {
      console.error("Error saving selected data:", error);
      alert(`Error saving data: ${error}`);
    }
  }

  // --- Canvas Drawing Logic ---

  const getCanvasPoint = (e: MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    // Scale mouse coordinates from display size to native image size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // 【变更】修改鼠标按下逻辑
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!selectedPersonId) {
        alert("在绘制前请从侧边栏选择一个人物ID。");
        return;
    }
    // 如果已经画了两个框，则重置，允许用户重新画
    if (manualBboxes.length >= 2) {
      setManualBboxes([]);
    }
    setIsPlaying(false); // 绘图时暂停
    const point = getCanvasPoint(e);
    if (!point) return;
    setIsDrawing(true);
    // 开始绘制一个新的框
    setCurrentDrawingBox([point.x, point.y, point.x, point.y]);
  };

  // 【变更】修改鼠标移动逻辑
  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(e);
    if (!point || !currentDrawingBox) return;
    // 更新当前正在绘制的框
    setCurrentDrawingBox([currentDrawingBox[0], currentDrawingBox[1], point.x, point.y]);
  };

  // 【变更】修改鼠标抬起逻辑
  const handleMouseUp = () => {
    if (!isDrawing || !currentDrawingBox) return;
    setIsDrawing(false);
    // 将绘制完成的框添加到 manualBboxes 数组中
    setManualBboxes(prev => [...prev, currentDrawingBox]);
    // 清空当前正在绘制的框
    setCurrentDrawingBox(null);
  };

  // --- Effects ---

  // Effect for auto-playing frames
  useEffect(() => {
    if (!isPlaying || !pythonReady) {
      return;
    }

    let isFetching = false;
    const intervalId = window.setInterval(async () => {
      if (isFetching) {
        return; // Skip if previous frame is still being fetched
      }
      isFetching = true;
      await getNextFrame();
      isFetching = false;
    }, 1000 / fps);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, pythonReady, fps, getNextFrame]);

  // 【变更】修改画布渲染逻辑，以显示所有类型的框
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 绘制来自后端的已有边界框
    currentCamData?.bboxes.forEach(({ id, box, color }) => {
      const [x1_a, y1_a, x2_a, y2_a, x1_b, y1_b, x2_b, y2_b] = box;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      // 绘制第一个框
      const width_a = x2_a - x1_a;
      const height_a = y2_a - y1_a;
      ctx.strokeRect(x1_a, y1_a, width_a, height_a);

      // 绘制第二个框
      const width_b = x2_b - x1_b;
      const height_b = y2_b - y1_b;
      ctx.strokeRect(x1_b, y1_b, width_b, height_b);
      
      ctx.fillStyle = color;
      ctx.font = "14px Arial";
      ctx.fillText(`ID: ${id}`, x1_a, y1_a > 15 ? y1_a - 5 : y1_a + 15);
    });

    // 2. 绘制用户已完成、等待提交的框 (用黄色实线)
    manualBboxes.forEach(box => {
      const [x1, y1, x2, y2] = box;
      const startX = Math.min(x1, x2);
      const startY = Math.min(y1, y2);
      const width = Math.abs(x1 - x2);
      const height = Math.abs(y1 - y2);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 3;
      ctx.strokeRect(startX, startY, width, height);
    });

    // 3. 绘制用户当前正在画的框 (用绿色虚线)
    if (currentDrawingBox) {
      const [x1, y1, x2, y2] = currentDrawingBox;
      const startX = Math.min(x1, x2);
      const startY = Math.min(y1, y2);
      const width = Math.abs(x1 - x2);
      const height = Math.abs(y1 - y2);
      ctx.strokeStyle = "green";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(startX, startY, width, height);
      ctx.setLineDash([]);
    }
  }, [currentCamData, manualBboxes, currentDrawingBox]); // 添加依赖项

  return (
    <div className="annotation-tool">
      <aside className="sidebar">
        <div className="settings-section">
          <Settings
            onApply={() => {
              setPythonReady(true);
              // now we can get the first frame
              getNextFrame();
            }}
          />
        </div>

        <hr />

        <h2>Controls</h2>
        <div className="control-panel">
          <button onClick={handleLoadVideos}>Load Videos</button>
          <button onClick={getNextFrame}>Next Frame</button>
          <button onClick={getPrevFrame} disabled={!frameData || frameData.frame_number <= 1}>Prev Frame</button>
          <button onClick={() => setIsPlaying(p => !p)} disabled={!pythonReady}>
            {isPlaying ? "Pause" : "Auto Play"}
          </button>
          <button onClick={saveSelectedData}>Save Selected</button>
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label htmlFor="fps-input">Playback Speed: {fps} FPS</label>
          <input
            id="fps-input"
            type="range"
            min="1"
            max="30"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            disabled={isPlaying}
          />
        </div>

        <hr />

        <h2>Save Range</h2>
        <div className="save-range-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <label htmlFor="start-frame-input" style={{flexShrink: 0, minWidth: '80px'}}>Start Frame:</label>
                <input
                    id="start-frame-input"
                    type="number"
                    value={startFrame}
                    onChange={(e) => setStartFrame(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    min="1"
                    style={{width: '160px'}}
                />
                
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="end-frame-input" style={{flexShrink: 0, minWidth: '80px'}}>End Frame:</label>
                <input
                    id="end-frame-input"
                    type="number"
                    value={endFrame}
                    onChange={(e) => setEndFrame(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    min="1"
                    max={maxFrame > 0 ? maxFrame : undefined}
                    style={{width: '160px'}}
                />
               
            </div>
        </div>

        <hr />

        <hr />

        <h2>Manual Correction</h2>
        <div className="manual-annotation">
            <label htmlFor="person-id-input">Person ID to correct:</label>
            <input
                id="person-id-input"
                type="number"
                placeholder="Enter ID"
                onChange={(e) => {
                  setSelectedPersonId(parseInt(e.target.value, 10));
                  setManualBboxes([]); // 切换ID时清空已绘制的框
                }}
                value={selectedPersonId ?? ""}
            />
            {/* 【新增】显示当前绘制进度 */}
            <p>已绘制: {manualBboxes.length} / 2 个框</p>
            {/* 【变更】按钮的 disabled 状态取决于是否画了两个框 */}
            <button onClick={submitManualBbox} disabled={manualBboxes.length !== 2}>
                Submit Bbox
            </button>
        </div>
        <hr />

        <h2>Current Frame Detections</h2>
        <p>Camera: {selectedCamId ?? 'None'}</p>
        <ul className="person-list">
          {currentCamData?.bboxes.map(({ id, color }) => (
            <li
              key={id}
              className={selectedPersonId == id ? 'selected' : ''}
              onClick={()=>{
                setSelectedPersonId(id);
                setManualBboxes([]); // 点击列表选择ID时也清空已绘制的框
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{width: "100%"}}>
                  Person ID: {id}
                </span>
                <div style={{ width: '20px', height: '20px', backgroundColor: color, border: '1px solid #ccc' }}></div>
              </div>
            </li>
          ))}
          {currentCamData?.bboxes.length === 0 && <li>No persons detected.</li>}
        </ul>
        <hr />

        <h2>Persons to Save</h2>
        <ul className="person-list">
          {Array.from(allUniquePersonIds).sort((a, b) => a - b).map((id) => (
            <li
              key={`save-${id}`}
              className={idsToSave.has(id) ? 'selected' : ''}
              onClick={() => handleToggleIdForSave(id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{width: "100%"}}>Person ID: {id}</span>
                
                
              </div>
            </li>
          ))}
          {allUniquePersonIds.size === 0 && <li>No persons detected yet.</li>}
        </ul>
      </aside>

      <main className="main-content">
        <h1>Frame Annotation Tool</h1>
        <div className="frame-and-camera-controls">
          <p>Frame: {frameData?.frame_number ?? 'Loading...'}</p>
          {/* Camera Selection UI */}
          <div className="camera-selection">
            <div className="camera-buttons">
              {frameData && Object.keys(frameData.cams).map(camId => (
                <button
                  key={camId}
                  className={`camera-button ${selectedCamId === camId ? 'selected' : ''}`}
                  onClick={() => setSelectedCamId(camId)}
                >
                  {camId}
                </button>
              ))}
            </div>
          </div>
        </div>
        <VideoDisplay
          frameData={displayFrameData}
          imageRef={imageRef}
          canvasRef={canvasRef}
          imageSize={imageSize}
          setImageSize={setImageSize}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
        />
      </main>
    </div>
  );
}

export default App;