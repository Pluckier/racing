import React, { useMemo } from 'react';
import { HOT_TRAINERS, HOT_JOCKEYS, HOT_FOALED, HOT_OWNERS } from '../../utils/racingLogic';
import { useStore } from '../../store/alarmStore';

const TrainerSelections = ({ races, onClose }) => {
  const selectedTrainers = useStore((state) => state.selectedTrainers);
  const setSelectedTrainers = useStore((state) => state.setSelectedTrainers);
  
  const selectedJockeys = useStore((state) => state.selectedJockeys);
  const setSelectedJockeys = useStore((state) => state.setSelectedJockeys);

  const selectedOwners = useStore((state) => state.selectedOwners);
  const setSelectedOwners = useStore((state) => state.setSelectedOwners);

  const selectedFoaled = useStore((state) => state.selectedFoaled);
  const setSelectedFoaled = useStore((state) => state.setSelectedFoaled);

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

  // Extract all distinct jockeys from today's races
  const todaysOwners = useMemo(() => {
    const owners = new Set();
    if (races) {
      races.forEach(race => {
        if (race.horses) {
          race.horses.forEach(horse => {
            if (horse.owner) {
              const trimmed = horse.owner.trim();
              if (trimmed) {
                owners.add(trimmed);
              }
            }
          });
        }
      });
    }
    return Array.from(owners).sort((a, b) => a.localeCompare(b));
  }, [races]);

  //"foaled": "D: Moon Of Love (Kodiac) S: Cotai Glory",
  // Extract all distinct jockeys from today's races
  const todaysFoaled = useMemo(() => {
    const foaled = new Set();
    if (races) {
      races.forEach(race => {
        if (race.horses) {
          race.horses.forEach(horse => {
            if (horse.foaled) {
              const trimmed = horse.foaled.trim();
              if (trimmed) {
                foaled.add(trimmed);
              }
            }
          });
        }
      });
    }
    return Array.from(foaled).sort((a, b) => a.localeCompare(b));
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

  // Jockey checking logic
  const isOwnerChecked = (owner) => {
    if (selectedOwners === null) {
      return HOT_OWNERS.some(o => owner.includes(o));
    }
    return selectedOwners.includes(owner);
  };

  const handleToggleOwner = (owner) => {
    let currentCheckedList;
    if (selectedOwners === null) {
      currentCheckedList = todaysOwners.filter(o => HOT_OWNERS.some(hot => o.includes(hot)));
    } else {
      currentCheckedList = [...selectedOwners];
    }

    if (currentCheckedList.includes(owner)) {
      setSelectedOwners(currentCheckedList.filter(o => o !== owner));
    } else {
      setSelectedOwners([...currentCheckedList, owner]);
    }
  };

  // Jockey checking logic
  const isFoaledChecked = (foaled) => {
    if (selectedFoaled === null) {
      return HOT_FOALED.some(f => foaled.includes(f));
    }
    return selectedFoaled.includes(foaled);
  };

  const handleToggleFoaled = (foaled) => {
    let currentCheckedList;
    if (selectedFoaled === null) {
      currentCheckedList = todaysFoaled.filter(f => HOT_FOALED.some(hot => f.includes(hot)));
    } else {
      currentCheckedList = [...selectedFoaled];
    }

    if (currentCheckedList.includes(foaled)) {
      setSelectedFoaled(currentCheckedList.filter(f => f !== foaled));
    } else {
      setSelectedFoaled([...currentCheckedList, foaled]);
    }
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
          marginBottom: '24px',
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



      {/* Owners Section */}
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
          Owners Today
        </summary>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
          marginTop: '15px',
          paddingRight: '5px'
        }}>
          {todaysOwners.map((owner) => {
            const checked = isOwnerChecked(owner);
            return (
              <label
                key={owner}
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
                  onChange={() => handleToggleOwner(owner)}
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
                  {owner}
                </span>
              </label>
            );
          })}
        </div>
      </details>

      {/* Foaled Section */}
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
          Parents Today
        </summary>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
          marginTop: '15px',
          paddingRight: '5px'
        }}>
          {todaysFoaled.map((foaled) => {
            const checked = isFoaledChecked(foaled);
            return (
              <label
                key={foaled}
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
                  onChange={() => handleToggleFoaled(foaled)}
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
                  {foaled}
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
