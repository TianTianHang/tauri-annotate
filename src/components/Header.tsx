
import React from 'react';

interface HeaderProps {
  appPhase: 'initial' | 'initial_run' | 'user_selection' | 'continuous_tracking' | 'lost_track' | 'tracking complete';
}

const Header: React.FC<HeaderProps> = ({ appPhase }) => {
  return (
    <header>
      <h1>Frame Annotation Tool</h1>
      <div className="status-messages">
        {appPhase === 'initial_run' && <p>Initial analysis in progress... Please wait.</p>}
        {appPhase === 'user_selection' && <p>Analysis complete. Please select the persons you want to track from the list on the right.</p>}
        {appPhase === 'lost_track' && <p style={{ color: 'red' }}>A tracked person has been lost! Please perform a manual correction below.</p>}
        {appPhase === 'tracking complete' && <p>All Tracking complete.</p>}
      </div>
    </header>
  );
};

export default Header;
