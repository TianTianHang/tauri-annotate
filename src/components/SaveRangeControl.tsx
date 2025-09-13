
import React from 'react';

interface SaveRangeControlProps {
  startFrame: number;
  setStartFrame: (value: number) => void;
  endFrame: number;
  setEndFrame: (value: number) => void;
  maxFrame: number;
}

const SaveRangeControl: React.FC<SaveRangeControlProps> = ({
  startFrame,
  setStartFrame,
  endFrame,
  setEndFrame,
  maxFrame,
}) => {
  return (
    <div className="save-range-panel">
      <h2>Save Range</h2>
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
  );
};

export default SaveRangeControl;
