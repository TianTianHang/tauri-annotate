import React from 'react';

interface ZoomControlsProps {
  zoom: number;
  setZoom: (zoom: number) => void;
  resetZoomAndPan: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ zoom, setZoom, resetZoomAndPan }) => {
  const zoomIn = () => setZoom(Math.min(zoom * 1.2, 10));
  const zoomOut = () => setZoom(Math.max(zoom / 1.2, 1));

  return (
    <div className="zoom-controls">
      <button onClick={zoomIn}>+</button>
      <span className="zoom-level">{zoom.toFixed(1)}x</span>
      <button onClick={zoomOut}>-</button>
      <button onClick={resetZoomAndPan}>Reset</button>
    </div>
  );
};

export default ZoomControls;
