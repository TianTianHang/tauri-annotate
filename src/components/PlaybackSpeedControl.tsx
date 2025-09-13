
import React from 'react';

interface PlaybackSpeedControlProps {
  fps: number;
  setFps: (value: number) => void;
  isPlaying: boolean;
}

const PlaybackSpeedControl: React.FC<PlaybackSpeedControlProps> = ({ fps, setFps, isPlaying }) => {
  return (
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
  );
};

export default PlaybackSpeedControl;
