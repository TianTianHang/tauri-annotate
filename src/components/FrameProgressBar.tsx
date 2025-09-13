
import React from 'react';

interface FrameProgressBarProps {
  currentFrame: number;
  lastFrame: number;
  onFrameChange: (frame: number) => void;
}

const FrameProgressBar: React.FC<FrameProgressBarProps> = ({ currentFrame, lastFrame, onFrameChange }) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(e.target.value, 10);
    onFrameChange(frame);
  };

  return (
    <div className="frame-progress-bar">
      <input
        type="range"
        min="1"
        max={lastFrame}
        value={currentFrame}
        onChange={handleSliderChange}
        className="slider"
      />
    </div>
  );
};

export default FrameProgressBar;
