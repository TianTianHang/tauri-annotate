
import React from 'react';

interface PersonListProps {
  allUniquePersonIds: Set<number>;
  idsToSave: Set<number>;
  handleToggleIdForSave: (id: number) => void;
}

const PersonList: React.FC<PersonListProps> = ({ allUniquePersonIds, idsToSave, handleToggleIdForSave }) => {
  return (
    <div className="person-list-container">
      <h2>Persons to Save</h2>
      <ul className="person-list">
        {Array.from(allUniquePersonIds).sort((a, b) => a - b).map((id) => (
          <li
            key={`save-${id}`}
            className={idsToSave.has(id) ? 'selected' : ''}
            onClick={() => handleToggleIdForSave(id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: "100%" }}>Person ID: {id}</span>
            </div>
          </li>
        ))}
        {allUniquePersonIds.size === 0 && <li>No persons detected yet.</li>}
      </ul>
    </div>
  );
};

export default PersonList;
