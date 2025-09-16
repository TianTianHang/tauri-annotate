import React from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface PersonListProps {
  allUniquePersonIds: Set<number>;
  idsToSave: Set<number>;
  handleToggleIdForSave: (id: number) => void;
}

const Row: React.FC<ListChildComponentProps & {
  sortedIds: number[];
  idsToSave: Set<number>;
  handleToggleIdForSave: (id: number) => void;
}> = ({ index, style, sortedIds, idsToSave, handleToggleIdForSave }) => {
  const id = sortedIds[index];
  const isSelected = idsToSave.has(id);
  const [isHovered, setIsHovered] = React.useState(false);

  // 合并背景色逻辑：优先 selected，其次 hover
  let backgroundColor = 'transparent';
  let color = 'inherit';
  let borderColor = 'transparent';

  if (isSelected) {
    backgroundColor = '#646cff';
    color = 'white';
    borderColor = '#8c90ff';
  } else if (isHovered) {
    backgroundColor = '#3a3a3a';
    color = 'white'; // 可选：hover 时也变白色文字
  }

  return (
    <div
      style={{
        ...style,
        padding: '0.5rem',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s, border-color 0.2s',
        border: `1px solid ${borderColor}`,
        boxSizing: 'border-box',
        backgroundColor,
        color,
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => handleToggleIdForSave(id)}
    >
      <span>Person ID: {id}</span>
    </div>
  );
};

const PersonList: React.FC<PersonListProps> = ({ allUniquePersonIds, idsToSave, handleToggleIdForSave }) => {
  const sortedIds = Array.from(allUniquePersonIds).sort((a, b) => a - b);
  const itemCount = sortedIds.length;

  // 如果没有数据，直接显示提示
  if (itemCount === 0) {
    return (
      <div className="person-list-container">
        <h2>Persons to Save</h2>
        <ul className="person-list">
          <li>No persons detected yet.</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="person-list-container">
      <h2>Persons to Save</h2>
      <div style={{ height: '400px', width: '100%' }}> {/* 设置容器高度 */}
        <List
          height={400}          // 列表高度
          itemCount={itemCount} // 总项数
          itemSize={42}         // 每项高度（根据你的 CSS 调整）
          width="100%"
          className="person-list"
        >
          {({ index, style }) => (
            <Row
              index={index}
              style={style}
              sortedIds={sortedIds}
              idsToSave={idsToSave}
              handleToggleIdForSave={handleToggleIdForSave} data={undefined}            />
          )}
        </List>
      </div>
    </div>
  );
};

export default PersonList;