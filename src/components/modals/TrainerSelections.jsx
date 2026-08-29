import React, { useMemo } from 'react';
import { HOT_TRAINERS, HOT_JOCKEYS } from '../../utils/racingLogic';
import { useStore } from '../../store/alarmStore';

const TrainerSelections = ({ races, onClose }) => {
  const selectedTrainers = useStore((state) => state.selectedTrainers);
  const setSelectedTrainers = useStore((state) => state.setSelectedTrainers);
  
  const selectedJockeys = useStore((state) => state.selectedJockeys);
  const setSelectedJockeys = useStore((state) => state.setSelectedJockeys);

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
    return Array.from(trainers).sort((a, b) => a.localeCompare(b));
  }, [races]);

  // Extract all distinct jockeys from today's races
  const todaysJockeys = useMemo(() => {
    const jockeys = new Set();
    if (races) {
      races.forEach(race => {
        if (race.horses) {
          race.horses.forEach(horse => {
            if (horse.jockey) {
              const trimmed = horse.jockey.trim();
              if (trimmed) {
                jockeys.add(trimmed);
              }
            }
          });
        }
      });
    }
    return Array.from(jockeys).sort((a, b) => a.localeCompare(b));
  }, [races]);

  // Trainer checking logic
  const isTrainerChecked = (trainer) => {
    if (selectedTrainers === null) {
      return HOT_TRAINERS.some(t => trainer.includes(t));
    }
    return selectedTrainers.includes(trainer);
  };

  const handleToggleTrainer = (trainer) => {
    let currentCheckedList;
    if (selectedTrainers === null) {
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

  // Jockey checking logic
  const isJockeyChecked = (jockey) => {
    if (selectedJockeys === null) {
      return HOT_JOCKEYS.some(j => jockey.includes(j));
    }
    return selectedJockeys.includes(jockey);
  };

  const handleToggleJockey = (jockey) => {
    let currentCheckedList;
    if (selectedJockeys === null) {
      currentCheckedList = todaysJockeys.filter(j => HOT_JOCKEYS.some(hot => j.includes(hot)));
    } else {
      currentCheckedList = [...selectedJockeys];
    }

    if (currentCheckedList.includes(jockey)) {
      setSelectedJockeys(currentCheckedList.filter(j => j !== jockey));
    } else {
      setSelectedJockeys([...currentCheckedList, jockey]);
    }
  };

  return (
    <div className="trainer-selections-container" style={{ padding: '10px 5px', maxHeight: '550px', overflowY: 'auto' }}>
      
      {/* Trainers Section */}
      <details style={{ marginBottom: '24px' }}>
        <summary style={{
          color: 'var(--text-h)',
          fontSize: '1.1rem',
          fontWeight: '600',
          cursor: 'pointer',
          paddingBottom: '6px',
          borderBottom: '1px solid var(--border)',
          userSelect: 'none',
          listStylePosition: 'inside'
        }}>
          Trainers Today
        </summary>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
          marginTop: '15px',
          paddingRight: '5px'
        }}>
          {todaysTrainers.map((trainer) => {
            const checked = isTrainerChecked(trainer);
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
                  onChange={() => handleToggleTrainer(trainer)}
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
      </details>

      {/* Jockeys Section */}
      <details>
        <summary style={{
          color: 'var(--text-h)',
          fontSize: '1.1rem',
          fontWeight: '600',
          cursor: 'pointer',
          paddingBottom: '6px',
          borderBottom: '1px solid var(--border)',
          userSelect: 'none',
          listStylePosition: 'inside'
        }}>
          Jockeys Today
        </summary>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
          marginTop: '15px',
          paddingRight: '5px'
        }}>
          {todaysJockeys.map((jockey) => {
            const checked = isJockeyChecked(jockey);
            return (
              <label
                key={jockey}
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
                  onChange={() => handleToggleJockey(jockey)}
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
                  {jockey}
                </span>
              </label>
            );
          })}
        </div>
      </details>

    </div>
  );
};

export default TrainerSelections;
