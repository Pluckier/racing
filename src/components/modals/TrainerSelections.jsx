import React, { useState } from 'react';
import { HOT_TRAINERS } from '../../utils/racingLogic';

const TrainerSelections = ({ onClose }) => {
  // Initialize state with all hot trainers checked
  const [checkedTrainers, setCheckedTrainers] = useState(
    () => new Set(HOT_TRAINERS)
  );

  const handleToggle = (trainer) => {
    setCheckedTrainers(prev => {
      const next = new Set(prev);
      if (next.has(trainer)) {
        next.delete(trainer);
      } else {
        next.add(trainer);
      }
      return next;
    });
  };

  return (
    <div className="trainer-selections-container" style={{ padding: '10px 5px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '12px',
        maxHeight: '400px',
        overflowY: 'auto',
        paddingRight: '5px'
      }}>
        {HOT_TRAINERS.map((trainer) => {
          const isChecked = checkedTrainers.has(trainer);
          return (
            <label
              key={trainer}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border, #e2e8f0)',
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(trainer)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#10B981'
                }}
              />
              <span style={{ color: isChecked ? 'var(--text, #1d2d44)' : '#a0aec0', fontWeight: isChecked ? '600' : 'normal' }}>
                {trainer}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default TrainerSelections;
