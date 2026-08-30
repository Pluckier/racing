import React, { useMemo } from 'react';
import { HOT_TRAINERS, HOT_JOCKEYS, HOT_FOALED, HOT_OWNERS } from '../../utils/racingLogic';
import { useStore } from '../../store/alarmStore';
import '../../css/TrainerSelections.css';

const extractUniqueHorseProperty = (races, propertyKey) => {
    const uniqueSet = new Set();
    
    races?.forEach(race => {
      race.horses?.forEach(horse => {
        const value = horse[propertyKey]?.trim();
        if (value) {
          uniqueSet.add(value);
        }
      });
    });

    return Array.from(uniqueSet).sort((a, b) => a.localeCompare(b));
  };

  
const TrainerSelections = ({ races, onClose }) => {

// Selected lists (arrays)
  const selectedTrainers = useStore((state) => state.selectedTrainers);
  const selectedJockeys = useStore((state) => state.selectedJockeys);
  const selectedOwners = useStore((state) => state.selectedOwners);
  const selectedFoaled = useStore((state) => state.selectedFoaled);

  // State setters (functions)
  const setSelectedTrainers = useStore((state) => state.setSelectedTrainers);
  const setSelectedJockeys = useStore((state) => state.setSelectedJockeys);
  const setSelectedOwners = useStore((state) => state.setSelectedOwners);
  const setSelectedFoaled = useStore((state) => state.setSelectedFoaled);

  // 2. Compute all four lists efficiently in a single useMemo loop
  const { todaysTrainers, todaysJockeys, todaysOwners, todaysFoaled } = useMemo(() => {
    return {
      todaysTrainers: extractUniqueHorseProperty(races, 'trainer'),
      todaysJockeys:  extractUniqueHorseProperty(races, 'jockey'),
      todaysOwners:   extractUniqueHorseProperty(races, 'owner'),
      todaysFoaled:   extractUniqueHorseProperty(races, 'foaled'),
    };
  }, [races]);

  const RACING_CONFIG = {
    trainers: { selected: selectedTrainers, setter: setSelectedTrainers, todays: todaysTrainers, hot: HOT_TRAINERS },
    jockeys:  { selected: selectedJockeys,  setter: setSelectedJockeys,  todays: todaysJockeys,  hot: HOT_JOCKEYS },
    owners:   { selected: selectedOwners,   setter: setSelectedOwners,   todays: todaysOwners,   hot: HOT_OWNERS },
    parents:  { selected: selectedFoaled,   setter: setSelectedFoaled,   todays: todaysFoaled,   hot: HOT_FOALED }
  };

  const handleDeselectAll = (key) => {
    RACING_CONFIG[key]?.setter([]);
  };

  const handleSetToDefaults = (key) => {
    const config = RACING_CONFIG[key];
    if (config) config.setter(config.hot);
  };

  const isItemChecked = (item, key) => {
    const config = RACING_CONFIG[key];
    if (!config) return false;
    return config.selected === null 
      ? config.hot.some(h => item.includes(h)) 
      : config.selected.includes(item);
  };

  const handleToggleItem = (item, key) => {
    const config = RACING_CONFIG[key];
    if (!config) return;

    const { selected, setter, todays, hot } = config;
    const currentList = selected === null ? todays.filter(t => hot.some(h => t.includes(h))) : [...selected];

    setter(
      currentList.includes(item) 
        ? currentList.filter(i => i !== item) 
        : [...currentList, item]
    );
  };

  return (
    <div className="trainer-selections-container" style={{ padding: '10px 5px', maxHeight: '550px', overflowY: 'auto' }}>
      
    {/* Trainers Section */}
    <details style={{ marginBottom: '24px' }}>
      <summary className='category-summary'>
        Trainers Today
      </summary>

      {/* New Actions/Controls Bar */}
      <div className='category-buttons'>
      <button 
          type="button"
          onClick={() => handleDeselectAll('trainers')} 
          className='theButton'
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10B981'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          Deselect All
        </button>

        <button 
          type="button"
          onClick={() => handleSetToDefaults('trainers')} 
          className='theButton'
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10B981'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          Set to Defaults
        </button>
      </div>

      <div className='check-grid'>
        {todaysTrainers.map((trainer) => {
          const checked = isItemChecked(trainer, "trainers");
          return (
            <label
              key={trainer}
              className='theCheck'
              style={{
                backgroundColor: checked ? 'var(--accent-bg, var(--bg-card))' : 'var(--bg-card)',
                border: checked ? '1px solid #10B981' : '1px solid var(--border)',
                boxShadow: checked ? '0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleToggleItem(trainer, "trainers")}
                className='check'
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
      <details style={{ marginBottom: '24px' }}>
        <summary className='category-summary'>
          Jockeys Today
        </summary>

      <div className='category-buttons'>
      <button 
          type="button"
          onClick={() => handleDeselectAll('jockeys')} 
          className='theButton'
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10B981'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          Deselect All
        </button>

        <button 
          type="button"
          onClick={() => handleSetToDefaults('jockeys')} 
          className='theButton'
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10B981'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          Set to Defaults
        </button>
      </div>

        <div className='check-grid'>
          {todaysJockeys.map((jockey) => {
            const checked = isItemChecked(jockey, "jockeys");
            return (
              <label
                key={jockey}
                className='theCheck'
                style={{
                  backgroundColor: checked ? 'var(--accent-bg, var(--bg-card))' : 'var(--bg-card)',
                  border: checked ? '1px solid #10B981' : '1px solid var(--border)',
                  boxShadow: checked ? '0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleItem(jockey, "jockeys")}
                  className='check'
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
        <summary className='category-summary'>
          Owners Today
        </summary>

      <div className='category-buttons'>
      <button 
          type="button"
          onClick={() => handleDeselectAll('owners')} 
          className='theButton'
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10B981'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          Deselect All
        </button>

        <button 
          type="button"
          onClick={() => handleSetToDefaults('owners')} 
          className='theButton'
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10B981'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          Set to Defaults
        </button>
      </div>

       <div className='check-grid'>
          {todaysOwners.map((owner) => {
            const checked = isItemChecked(owner, "owners");
            return (
              <label
                key={owner}
                className='theCheck'
                style={{
                  backgroundColor: checked ? 'var(--accent-bg, var(--bg-card))' : 'var(--bg-card)',
                  border: checked ? '1px solid #10B981' : '1px solid var(--border)',
                  boxShadow: checked ? '0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleItem(owner, "owners")}
                  className='check'
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
       <summary className='category-summary'>
          Parents Today
        </summary>

      <div className='category-buttons'>
      <button 
          type="button"
          onClick={() => handleDeselectAll('parents')} 
          className='theButton'
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10B981'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          Deselect All
        </button>

        <button 
          type="button"
          onClick={() => handleSetToDefaults('parents')} 
          className='theButton'
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10B981'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          Set to Defaults
        </button>
      </div>



       <div className='check-grid'>
          {todaysFoaled.map((foaled) => {
            const checked = isItemChecked(foaled, "parents");
            return (
              <label
                key={foaled}
                className='theCheck'
                style={{
                  backgroundColor: checked ? 'var(--accent-bg, var(--bg-card))' : 'var(--bg-card)',
                  border: checked ? '1px solid #10B981' : '1px solid var(--border)',
                  boxShadow: checked ? '0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleItem(foaled, "parents")}
                  className='check'
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
