
import React from 'react';
import { FrameData } from '../types';

interface FrameControlsProps {
  frameData: FrameData | null;
  selectedCamId: string | null;
  setSelectedCamId: (id: string) => void;
}

const FrameControls: React.FC<FrameControlsProps> = ({ frameData, selectedCamId, setSelectedCamId }) => {
  return (
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
  );
};

export default FrameControls;
