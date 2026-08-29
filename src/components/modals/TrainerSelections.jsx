import React, { useMemo } from 'react';
import { HOT_TRAINERS } from '../../utils/racingLogic';
import { useStore } from '../../store/alarmStore';

const TrainerSelections = ({ races, onClose }) => {
  const selectedTrainers = useStore((state) => state.selectedTrainers);
  const setSelectedTrainers = useStore((state) => state.setSelectedTrainers);

  // Extract all distinct trainers from today's races and sort alphabetically
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
    return Array.from(trainers).sort((a, b) => a.localeCompare(b));
  }, [races]);

  // Determine if a trainer is currently checked
  const isChecked = (trainer) => {
    if (selectedTrainers === null) {
      // If store is null, check default HOT_TRAINERS
      return HOT_TRAINERS.some(t => trainer.includes(t));
    }
    return selectedTrainers.includes(trainer);
  };

  const handleToggle = (trainer) => {
    let currentCheckedList;
    if (selectedTrainers === null) {
      // Initialize with today's hot trainers matching default HOT_TRAINERS
      currentCheckedList = todaysTrainers.filter(t => HOT_TRAINERS.some(hot => t.includes(hot)));
    } else {
      currentCheckedList = [...selectedTrainers];
    }

    if (currentCheckedList.includes(trainer)) {
      setSelectedTrainers(currentCheckedList.filter(t => t !== trainer));
    } else {
      setSelectedTrainers([...currentCheckedList, trainer]);
    }
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
        {todaysTrainers.map((trainer) => {
          const checked = isChecked(trainer);
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
                backgroundColor: checked ? 'var(--accent-bg, var(--bg-card))' : 'var(--bg-card)',
                border: checked ? '1px solid #10B981' : '1px solid var(--border)',
                transition: 'all 0.2s ease',
                userSelect: 'none',
                boxShadow: checked ? '0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleToggle(trainer)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#10B981'
                }}
              />
              <span style={{
                color: checked ? 'var(--text-h)' : 'var(--text)',
                fontWeight: checked ? '600' : 'normal',
                opacity: checked ? 1 : 0.7
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
