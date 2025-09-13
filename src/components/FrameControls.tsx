
import React, { useState } from 'react';
import { FrameData } from '../types';

interface FrameControlsProps {
  frameData: FrameData | null;
  selectedCamId: string | null;
  setSelectedCamId: (id: string) => void;
}

const FrameControls: React.FC<FrameControlsProps> = ({ frameData, selectedCamId, setSelectedCamId }) => {
  const [startIndex, setStartIndex] = useState(0);
  const camsPerPage = 8;

  const camIds = frameData ? Object.keys(frameData.cams) : [];
  const visibleCamIds = camIds.slice(startIndex, startIndex + camsPerPage);

  const handlePrev = () => {
    setStartIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setStartIndex(prev => Math.min(prev + 1, camIds.length - camsPerPage));
  };

  return (
    <div className="frame-and-camera-controls">
      <p>Frame: {frameData?.frame_number ?? 'Loading...'}</p>
      <div className="camera-selection">
        <div className="camera-buttons">
          {camIds.length > camsPerPage && (
            <button onClick={handlePrev} disabled={startIndex === 0} className="arrow-button">
              &lt;
            </button>
          )}
          {visibleCamIds.map(camId => (
            <button
              key={camId}
              className={`camera-button ${selectedCamId === camId ? 'selected' : ''}`}
              onClick={() => setSelectedCamId(camId)}
            >
              {camId}
            </button>
          ))}
          {camIds.length > camsPerPage && (
            <button onClick={handleNext} disabled={startIndex >= camIds.length - camsPerPage} className="arrow-button">
              &gt;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FrameControls;
