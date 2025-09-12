import { useState, useRef, useEffect, MouseEvent, useCallback } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open, save } from "@tauri-apps/api/dialog";
import "./App.css";
import VideoDisplay from "./components/VideoDisplay";
import Settings from "./components/Settings";
import { FrameData, Point } from "./types";




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
  const [lostids, setLostids] = useState<Set<number>>(new Set());
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [allUniquePersonIds, setAllUniquePersonIds] = useState<Set<number>>(new Set());
  const [startFrame, setStartFrame] = useState(1);
  const [endFrame, setEndFrame] = useState(1);
  const [maxFrame, setMaxFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(10);
  const [swapState, setSwapState] = useState<{ active: boolean; ids: number[] }>({ active: false, ids: [] });
  // [NEW] Added state variable to track the application's current phase.
  const [appPhase, setAppPhase] = useState<'initial' | 'initial_run' | 'user_selection' | 'continuous_tracking' | 'lost_track' | 'tracking complete'>('initial');
  // [NEW] State for frame skip input and calculation
  const [finalAnalysisFrameSkip, setFinalAnalysisFrameSkip] = useState(1);
  const [sourceFps, setSourceFps] = useState(30); // Default video source FPS
  const [targetFps, setTargetFps] = useState(1);   // Default desired target FPS


  // --- Refs for DOM elements ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const frameNumberRef = useRef(0)
  // --- Derived State ---
  const currentCamData = frameData && selectedCamId ? frameData.cams[selectedCamId] : null;
  const displayFrameData = currentCamData ? { ...currentCamData, frame_number: frameData!.frame_number } : null;

  // --- Backend Interaction ---

  // [MODIFIED] Removed the automatic phase transition.
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

  // [MODIFIED] getNextFrame function
  const getNextFrame = useCallback(async () => {
    if (!pythonReady) {
      // Maybe show a message to the user to configure the backend first
      console.log("Python backend is not ready. Please configure it in the settings.");
      return;
    }
    try {
      // [FIX] Calculate target frame using the ref to get the most up-to-date value.
      const targetFrame = frameNumberRef.current + 1;
      const responseStr = await invoke<string>("invoke_python", {
        command: "process_frame",
        params: { target_frame: targetFrame },
      });
      const response: FrameData = JSON.parse(responseStr);
      if(response.status === "waiting"){
        // 后端繁忙，直接返回，等待下一个 interval 再次尝试
        return;
      }
      if (response.status === 'finished') {
        setIsPlaying(false); // 停止自动播放
        setAppPhase("tracking complete")
        // alert('Video processing has finished.'); // 提示用户
        console.log('Video processing has finished.');
        return;
      }
      frameNumberRef.current = response.frame_number;
      setFrameData(response);
      // 应该 log 来自响应的最新帧号，而不是旧 state 中的
      console.log(response.frame_number);
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

      // Check if any of the selected IDs are lost
      if (appPhase === 'continuous_tracking' && idsToSave.size > 0) {
        const currentFrameIds = new Set(Object.values(response.cams).flatMap(cam => cam.bboxes.map(bbox => bbox.id)));
        const lostIds1 = Array.from(idsToSave).filter(id => !currentFrameIds.has(id));
        setLostids(new Set(lostIds1))
        if (lostIds1.length > 0) {
          console.warn(`Lost track of person ID(s): ${lostIds1.join(', ')}`);
          setIsPlaying(false); // Pause playback
          setAppPhase('lost_track');
          alert(`Lost person ID ${lostIds1.join(', ')}} at frame ${response.frame_number}. Please correct.`);
        }
      }

    } catch (error) {
      console.error("Error fetching next frame:", error);
      setIsPlaying(false); // Stop playing on error
      // For demonstration, let's set some mock data on error
      setFrameData(prev => ({
        status:"success",
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
  }, [pythonReady, selectedCamId, frameData, idsToSave, appPhase]);

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
      frameNumberRef.current = response.frame_number;
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


  // [NEW] A new handler to manually begin the continuous tracking phase.
  const handleStartTracking = () => {
    if (idsToSave.size === 0) {
      alert("Please select at least one person from the 'Persons to Save' list before starting.");
      return;
    }
    setAppPhase('continuous_tracking');
    setIsPlaying(true);
  };

  // [MODIFIED] handleLoadVideos function
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
      frameNumberRef.current = 0;

      const responseStr = await invoke<string>('invoke_python', {
        command: 'load_videos',
        params: { video_path: selectedPath },
      });
      const response = JSON.parse(responseStr);

      if (response.status === 'success') {
        alert(`Successfully loaded ${response.video_info} video(s).`);
        setPythonReady(true);
        setAppPhase('continuous_tracking');
        setIsPlaying(false); // 【新增】加载成功后自动开始播放
      } else {
        alert(`Error loading videos: ${response.message}`);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      alert(`An error occurred: ${error}`);
    }
  }

  // [MODIFIED] submitManualBbox function
  async function submitManualBbox() {
    if (manualBboxes.length !== 2 || selectedPersonId === null || !frameData || !selectedCamId) {
      alert("请先选择一个人物ID，并在图像上画两个框。");
      return;
    }
    setIsPlaying(false);

    const normalizedBboxes = manualBboxes.map(box => {
      const [x1, y1, x2, y2] = box;
      return [
        Math.round(Math.min(x1, x2)),
        Math.round(Math.min(y1, y2)),
        Math.round(Math.max(x1, x2)),
        Math.round(Math.max(y1, y2)),
      ];
    });

    const finalBbox = [...normalizedBboxes[0], ...normalizedBboxes[1]];

    try {
      await invoke("invoke_python", {
        command: "update_bbox",
        params: {
          frame_num: frameData.frame_number,
          cam_id: selectedCamId,
          person_id: selectedPersonId,
          bbox: finalBbox,
        },
      });
      alert(`人物 ${selectedPersonId} 在相机 ${selectedCamId} 上的边界框已提交!`);
      const newLostids = new Set(lostids);
      newLostids.delete(selectedPersonId)

      setLostids(newLostids)
      setManualBboxes([]);  
      setCurrentDrawingBox(null);
      
      // After correction, resume continuous tracking
      if (appPhase === 'lost_track' && newLostids.size === 0) {
        setAppPhase('continuous_tracking');
        setIsPlaying(true);
      }

      setAllUniquePersonIds(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedPersonId);
        return newSet;
      });

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
      const filePath = await save({
        title: "Save Selected Person Data",
        filters: [{
          name: 'JSON',
          extensions: ['json']
        }]
      });

      if (!filePath) {
        return;
      }

      const response = await invoke<any>("invoke_python", {
        command: "save_selected",
        params: {
          person_ids: Array.from(idsToSave),
          start_frame: startFrame,
          end_frame: endFrame,
          path: filePath,
        },
      });
      alert(`Data for ${idsToSave.size} person(s) from frame ${startFrame} to ${endFrame} saved to: ${response.path}`);
    } catch (error) {
      console.error("Error saving selected data:", error);
      alert(`Error saving data: ${error}`);
    }
  }

  // [MODIFIED] Added frame skip logic to runFinalAnalysis
  async function runFinalAnalysis() {
    if (idsToSave.size === 0) {
      alert("Please select one or more persons to analyze from the 'Persons to Save' list.");
      return;
    }
    
    // Prompt the user for the frame skip interval
    const skipPrompt = `请输入分析时跳过的帧数（例如，跳过18帧，则输入18）。
    您也可以使用右侧的帧率计算器来确定。`;
    let skipFrames = prompt(skipPrompt, finalAnalysisFrameSkip.toString());
    
    if (skipFrames === null || isNaN(parseInt(skipFrames, 10))) {
      alert("分析已取消。请输入有效的数字。");
      return;
    }
    
    const frameSkip = parseInt(skipFrames, 10);
    setFinalAnalysisFrameSkip(frameSkip);

    setIsPlaying(false);
    try {
      alert("Starting final analysis... This may take a moment.");
      const responseStr = await invoke<string>("invoke_python", {
        command: "run_final_analysis",
        params: {
          person_ids: Array.from(idsToSave),
          frame_skip: frameSkip
        },
      });
      const response = JSON.parse(responseStr);

      if (response.status === 'success') {
        alert("Final analysis completed successfully!");
      } else {
        alert(`Analysis failed: ${response.message}`);
      }
    } catch (error) {
      console.error("Error running final analysis:", error);
      alert(`An error occurred during analysis: ${error}`);
    }
  }

  // [NEW] Function to calculate frame skip interval
  const calculateFrameSkip = () => {
    if (sourceFps < 1 || targetFps < 1) {
      return 1;
    }
    return Math.floor(sourceFps / targetFps);
  };

  // --- ID Swap Logic ---

  const handleInitiateSwap = () => {
    setSwapState(prev => {
      const isActive = !prev.active;
      if (isActive) {
        alert("ID Merge mode activated. Please input the IDs below.");
      }
      return { active: isActive, ids: [] };
    });
    setIsPlaying(false);
  };

  const handleIdInputChange = (index: number, value: string) => {
    setSwapState(prev => {
      const newIds = [...prev.ids];
      newIds[index] = parseInt(value, 10) || 0; // Use 0 for invalid input
      return { ...prev, ids: newIds.filter(id => id > 0) };
    });
  };
  const handleConfirmSwap = async () => {
    if (swapState.ids.length !== 2) {
      alert("Please enter both a correct and a wrong ID.");
      return;
    }
    await triggerSwapConfirmation(swapState.ids);
  };
  // [MODIFIED] triggerSwapConfirmation function
  const triggerSwapConfirmation = async (ids: number[]) => {
    if (!frameData) return;
    const [id1, id2] = ids;
    const confirmed = window.confirm(`Are you sure you want to merge all future occurrences of ID ${id2} into ID ${id1} from frame ${frameData.frame_number} onwards? This action cannot be undone.\n\n(Correct ID: ${id1}, Wrong ID: ${id2})`);

    if (confirmed) {
      try {
        await invoke("invoke_python", { command: "swap_ids", params: { start_frame: frameData.frame_number, id1, id2 } });
        alert("IDs swapped successfully!");
        await getSpecificFrame(frameData.frame_number);
      } catch (error) {
        console.error("Error swapping IDs:", error);
        alert(`Failed to swap IDs: ${error}`);
      }
    }
    setSwapState({ active: false, ids: [] }); // Reset state
  };

  // --- Canvas Drawing Logic ---

  const getCanvasPoint = (e: MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!selectedPersonId) {
      alert("在绘制前请从侧边栏选择一个人物ID。");
      return;
    }
    if (manualBboxes.length >= 2) {
      setManualBboxes([]);
    }
    setIsPlaying(false);
    const point = getCanvasPoint(e);
    if (!point) return;
    setIsDrawing(true);
    setCurrentDrawingBox([point.x, point.y, point.x, point.y]);
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(e);
    if (!point || !currentDrawingBox) return;
    setCurrentDrawingBox([currentDrawingBox[0], currentDrawingBox[1], point.x, point.y]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentDrawingBox) return;
    setIsDrawing(false);
    setManualBboxes(prev => [...prev, currentDrawingBox]);
    setCurrentDrawingBox(null);
  };

  // --- Effects ---

  useEffect(() => {
    if (!isPlaying || !pythonReady) {
      return;
    }

    let isFetching = false;
    const intervalId = window.setInterval(async () => {
      if (isFetching) {
        return;
      }
      isFetching = true;
      await getNextFrame();
      isFetching = false;
    }, 1000 / fps);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, pythonReady, fps, getNextFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentCamData?.bboxes.forEach(({ id, box, color }) => {
      const [x1_a, y1_a, x2_a, y2_a, x1_b, y1_b, x2_b, y2_b] = box;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      const width_a = x2_a - x1_a;
      const height_a = y2_a - y1_a;
      ctx.strokeRect(x1_a, y1_a, width_a, height_a);

      const width_b = x2_b - x1_b;
      const height_b = y2_b - y1_b;
      ctx.strokeRect(x1_b, y1_b, width_b, height_b);

      ctx.fillStyle = color;
      ctx.font = "14px Arial";
      ctx.fillText(`ID: ${id}`, x1_a, y1_a > 15 ? y1_a - 5 : y1_a + 15);
    });

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
  }, [currentCamData, manualBboxes, currentDrawingBox]);

  return (
    <div className="annotation-tool">
      <aside className="sidebar">
        <div className="settings-section">
          <Settings
            onApply={() => {
              setPythonReady(true);
              getNextFrame();
            }}
          />
        </div>

        <hr />

        <h2>Controls</h2>
        <div className="control-panel">
          <button onClick={handleLoadVideos}>Load Videos</button>
          {/* [NEW] Add a button to manually start the continuous tracking phase */}
          {appPhase === 'user_selection' && (
            <button onClick={handleStartTracking} disabled={idsToSave.size === 0} title={idsToSave.size === 0 ? "Please select at least one ID to track" : ""}>
              Start Tracking
            </button>
          )}
          <button onClick={getNextFrame}>Next Frame</button>
          <button onClick={getPrevFrame} disabled={!frameData || frameData.frame_number <= 1}>Prev Frame</button>
          {/* [MODIFIED] "Auto Play" button disabled logic */}
          <button onClick={() => setIsPlaying(p => !p)} disabled={appPhase !== 'continuous_tracking'}>
            {isPlaying ? "Pause" : "Auto Play"}
          </button>
          <button onClick={saveSelectedData}>Save Selected</button>
          <button onClick={runFinalAnalysis}>Run Analysis</button>
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

        {/* [NEW] Frame Rate Calculator */}
        <h2>Calculation FPS</h2>
        <div className="frame-rate-calculator">
          <div className="form-group">
            <label htmlFor="source-fps">Vedio FPS:</label>
            <input 
              id="source-fps" 
              type="number" 
              value={sourceFps} 
              onChange={(e) => setSourceFps(parseFloat(e.target.value))} 
              min="1"
            />
          </div>
          <div className="form-group">
            <label htmlFor="target-fps">target FPS :</label>
            <input 
              id="target-fps" 
              type="number" 
              value={targetFps} 
              onChange={(e) => setTargetFps(parseFloat(e.target.value))} 
              min="0.1"
            />
          </div>
          <div className="calculation-result">
            <p>
              skip fps: <strong>{calculateFrameSkip()}</strong>
            </p>
          </div>
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
            <label htmlFor="start-frame-input" style={{ flexShrink: 0, minWidth: '80px' }}>Start Frame:</label>
            <input
              id="start-frame-input"
              type="number"
              value={startFrame}
              onChange={(e) => setStartFrame(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min="1"
              style={{ width: '160px' }}
            />

          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="end-frame-input" style={{ flexShrink: 0, minWidth: '80px' }}>End Frame:</label>
            <input
              id="end-frame-input"
              type="number"
              value={endFrame}
              onChange={(e) => setEndFrame(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min="1"
              max={maxFrame > 0 ? maxFrame : undefined}
              style={{ width: '160px' }}
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
              setManualBboxes([]);
              if (swapState.active) setSwapState({ active: false, ids: [] });
            }}
            value={selectedPersonId ?? ""}
          />
          <p>已绘制: {manualBboxes.length} / 2 个框</p>
          <button onClick={handleInitiateSwap} style={{ marginBottom: '10px' }}>
            {swapState.active ? `Cancel Merge (${swapState.ids.length}/2)` : 'Merge IDs'}
          </button>
          {swapState.active && (
            <>
              <div>
                <label htmlFor="correct-id-input">Correct ID:</label>
                <input
                  id="correct-id-input"
                  type="number"
                  placeholder="Correct ID"
                  value={swapState.ids[0] ?? ''}
                  onChange={(e) => handleIdInputChange(0, e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="wrong-id-input">Wrong ID:</label>
                <input
                  id="wrong-id-input"
                  type="number"
                  placeholder="Wrong ID"
                  value={swapState.ids[1] ?? ''}
                  onChange={(e) => handleIdInputChange(1, e.target.value)}
                />
              </div>
              <button onClick={handleConfirmSwap} disabled={swapState.ids.length !== 2}>
                Confirm Merge
              </button>
              <p style={{ color: 'orange' }}>Enter the correct and wrong IDs, then click Confirm.</p>
            </>
          )}
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
              key={`detection-${id}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: "100%" }}>
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
                <span style={{ width: "100%" }}>Person ID: {id}</span>
              </div>
            </li>
          ))}
          {allUniquePersonIds.size === 0 && <li>No persons detected yet.</li>}
        </ul>
      </aside>

      <main className="main-content">
        <h1>Frame Annotation Tool</h1>
        {/* [NEW] Added status messages display */}
        <div className="status-messages">
          {appPhase === 'initial_run' && <p>Initial analysis in progress... Please wait.</p>}
          {appPhase === 'user_selection' && <p>Analysis complete. Please select the persons you want to track from the list on the right.</p>}
          {appPhase === 'lost_track' && <p style={{ color: 'red' }}>A tracked person has been lost! Please perform a manual correction below.</p>}
          {appPhase === 'tracking complete' && <p>All Tracking complete.</p>}
        </div>
        <div className="frame-and-camera-controls">
          <p>Frame: {frameData?.frame_number ?? 'Loading...'}</p>
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