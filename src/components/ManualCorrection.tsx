
import React from 'react';

interface ManualCorrectionProps {
  selectedPersonId: number | null;
  setSelectedPersonId: (id: number | null) => void;
  manualBboxes: ([number, number, number, number])[];
  setManualBboxes: React.Dispatch<React.SetStateAction<([number, number, number, number])[]>>;
  swapState: { active: boolean; ids: number[] };
  setSwapState: React.Dispatch<React.SetStateAction<{ active: boolean; ids: number[] }>>;
  handleInitiateSwap: () => void;
  handleIdInputChange: (index: number, value: string) => void;
  handleConfirmSwap: () => void;
  submitManualBbox: () => void;
}

const ManualCorrection: React.FC<ManualCorrectionProps> = ({
  selectedPersonId,
  setSelectedPersonId,
  manualBboxes,
  setManualBboxes,
  swapState,
  setSwapState,
  handleInitiateSwap,
  handleIdInputChange,
  handleConfirmSwap,
  submitManualBbox,
}) => {
  return (
    <div className="manual-annotation">
      <h2>Manual Correction</h2>
      <label htmlFor="person-id-input">Person ID to correct:</label>
      <input
        id="person-id-input"
        type="number"
        placeholder="Enter ID"
        onChange={(e) => {
          const value = e.target.value;
          setSelectedPersonId(value ? parseInt(value, 10) : null);
          setManualBboxes([]);
          if (swapState.active) setSwapState({ active: false, ids: [] });
        }}
        value={selectedPersonId ?? ""}
      />
      <p>已绘制: {manualBboxes.length} / 2 个框</p>
      <button onClick={handleInitiateSwap} style={{ marginBottom: '10px' }}>
        {swapState.active ? `Cancel Merge (${swapState.ids.length}/2)` : 'Merge IDs'}
      </button>
      {swapState.active && (
        <>
          <div>
            <label htmlFor="correct-id-input">Correct ID:</label>
            <input
              id="correct-id-input"
              type="number"
              placeholder="Correct ID"
              value={swapState.ids[0] ?? ''}
              onChange={(e) => handleIdInputChange(0, e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="wrong-id-input">Wrong ID:</label>
            <input
              id="wrong-id-input"
              type="number"
              placeholder="Wrong ID"
              value={swapState.ids[1] ?? ''}
              onChange={(e) => handleIdInputChange(1, e.target.value)}
            />
          </div>
          <button onClick={handleConfirmSwap} disabled={swapState.ids.length !== 2}>
            Confirm Merge
          </button>
          <p style={{ color: 'orange' }}>Enter the correct and wrong IDs, then click Confirm.</p>
        </>
      )}
      <button onClick={submitManualBbox} disabled={manualBboxes.length !== 2}>
        Submit Bbox
      </button>
    </div>
  );
};

export default ManualCorrection;
