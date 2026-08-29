import React, { useState, useMemo } from 'react';
import { HOT_TRAINERS } from '../../utils/racingLogic';

const TrainerSelections = ({ races, onClose }) => {
  // Extract all distinct trainers from today's races
  const todaysTrainers = useMemo(() => {
    const trainers = new Set();
    if (races) {
      races.forEach(race => {
        if (race.horses) {
          race.horses.forEach(horse => {
            if (horse.trainer) {
              const trimmed = horse.trainer.trim();
              if (trimmed) {
                trainers.add(trimmed);
              }
            }
          });
        }
      });
    }
    return Array.from(trainers);
  }, [races]);

  // Merge HOT_TRAINERS and todaysTrainers, ensuring uniqueness and alphabetical sorting
  const allTrainers = useMemo(() => {
    const union = new Set(HOT_TRAINERS);
    todaysTrainers.forEach(t => union.add(t));
    return Array.from(union).sort((a, b) => a.localeCompare(b));
  }, [todaysTrainers]);

  // Initialize checked state with only the trainers that are in HOT_TRAINERS
  const [checkedTrainers, setCheckedTrainers] = useState(() => {
    // Only check trainers that are defined as hot
    return new Set(HOT_TRAINERS);
  });

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
        {allTrainers.map((trainer) => {
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
                backgroundColor: isChecked ? 'var(--accent-bg, var(--bg-card))' : 'var(--bg-card)',
                border: isChecked ? '1px solid #10B981' : '1px solid var(--border)',
                transition: 'all 0.2s ease',
                userSelect: 'none',
                boxShadow: isChecked ? '0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
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
              <span style={{
                color: isChecked ? 'var(--text-h)' : 'var(--text)',
                fontWeight: isChecked ? '600' : 'normal',
                opacity: isChecked ? 1 : 0.7
              }}>
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
