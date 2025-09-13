
import React from 'react';

interface DetectionListProps {
  selectedCamId: string | null;
  currentCamData: {
    bboxes: { id: number; color: string }[];
  } | null;
}

const DetectionList: React.FC<DetectionListProps> = ({ selectedCamId, currentCamData }) => {
  return (
    <div className="detection-list">
      <h2>Current Frame Detections</h2>
      <p>Camera: {selectedCamId ?? 'None'}</p>
      <ul className="person-list">
        {currentCamData?.bboxes.map(({ id, color }) => (
          <li key={`detection-${id}`}>
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
    </div>
  );
};

export default DetectionList;
