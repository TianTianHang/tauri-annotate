
import React from 'react';

interface FrameRateCalculatorProps {
  sourceFps: number;
  setSourceFps: (value: number) => void;
  targetFps: number;
  setTargetFps: (value: number) => void;
  calculateFrameSkip: () => number;
}

const FrameRateCalculator: React.FC<FrameRateCalculatorProps> = ({
  sourceFps,
  setSourceFps,
  targetFps,
  setTargetFps,
  calculateFrameSkip,
}) => {
  return (
    <div className="frame-rate-calculator">
      <h2>Calculation FPS</h2>
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
  );
};

export default FrameRateCalculator;
