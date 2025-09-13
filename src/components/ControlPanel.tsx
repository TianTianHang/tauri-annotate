
import React from 'react';
import { FrameData } from '../types';

interface ControlPanelProps {
  appPhase: 'initial' | 'initial_run' | 'user_selection' | 'continuous_tracking' | 'lost_track' | 'tracking complete';
  handleLoadVideos: () => void;
  handleStartTracking: () => void;
  idsToSave: Set<number>;
  getNextFrame: () => void;
  getPrevFrame: () => void;
  frameData: FrameData | null;
  setIsPlaying: (update: React.SetStateAction<boolean>) => void;
  isPlaying: boolean;
  saveSelectedData: () => void;
  runFinalAnalysis: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  appPhase,
  handleLoadVideos,
  handleStartTracking,
  idsToSave,
  getNextFrame,
  getPrevFrame,
  frameData,
  setIsPlaying,
  isPlaying,
  saveSelectedData,
  runFinalAnalysis,
}) => {
  return (
    <div>
      <h2>Controls</h2>
      <div className="control-panel">
         <button onClick={handleLoadVideos}>Load Videos</button>
      {appPhase === 'user_selection' && (
        <button onClick={handleStartTracking} disabled={idsToSave.size === 0} title={idsToSave.size === 0 ? "Please select at least one ID to track" : ""}>
          Start Tracking
        </button>
      )}
      <button onClick={getNextFrame}>Next Frame</button>
      <button onClick={getPrevFrame} disabled={!frameData || frameData.frame_number <= 1}>Prev Frame</button>
      <button onClick={() => setIsPlaying(p => !p)} disabled={appPhase !== 'continuous_tracking'}>
        {isPlaying ? "Pause" : "Auto Play"}
      </button>
      <button onClick={saveSelectedData}>Save Selected</button>
      <button onClick={runFinalAnalysis}>Run Analysis</button>
      </div>
     
    </div>
  );
};

export default ControlPanel;
