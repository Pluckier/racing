import React, { useMemo } from 'react';
import { HOT_TRAINERS, HOT_JOCKEYS, HOT_FOALED, HOT_OWNERS } from '../../utils/racingLogic';
import { useStore } from '../../store/alarmStore';
import '../../css/TrainerSelections.css';

const CONFIG = {
  trainers: { title: 'Trainers Today', prop: 'trainer', hot: HOT_TRAINERS, selector: s => s.selectedTrainers, setter: s => s.setSelectedTrainers },
  jockeys:  { title: 'Jockeys Today',  prop: 'jockey',  hot: HOT_JOCKEYS,  selector: s => s.selectedJockeys,  setter: s => s.setSelectedJockeys },
  owners:   { title: 'Owners Today',   prop: 'owner',   hot: HOT_OWNERS,   selector: s => s.selectedOwners,   setter: s => s.setSelectedOwners },
  parents:  { title: 'Parents Today',  prop: 'foaled',  hot: HOT_FOALED,   selector: s => s.selectedFoaled,   setter: s => s.setSelectedFoaled }
};

const TrainerSelections = ({ races }) => {
  // 1. Pull all store slices dynamically using a single useStore call
  const store = useStore((s) => s);

  // 2. TRUE Single-Pass Iteration: Loops through races/horses exactly ONCE
  const todaysData = useMemo(() => {
    const sets = { trainers: new Set(), jockeys: new Set(), owners: new Set(), parents: new Set() };
    
    races?.forEach(race => race.horses?.forEach(horse => {
      Object.entries(CONFIG).forEach(([key, cfg]) => {
        const val = horse[cfg.prop]?.trim();
        if (val) sets[key].add(val);
      });
    }));

    return Object.fromEntries(
      Object.entries(sets).map(([k, set]) => [k, Array.from(set).sort((a, b) => a.localeCompare(b))])
    );
  }, [races]);

  const isItemChecked = (item, key) => {
    const { selector, hot } = CONFIG[key];
    const selected = selector(store);
    return selected === null ? hot.some(h => item.includes(h)) : selected.includes(item);
  };

  const handleToggleItem = (item, key) => {
    const { selector, setter, hot } = CONFIG[key];
    const selected = selector(store);
    const current = selected === null ? todaysData[key].filter(t => hot.some(h => t.includes(h))) : [...selected];
    
    store[setter.name](current.includes(item) ? current.filter(i => i !== item) : [...current, item]);
  };

  return (
    <div className="trainer-selections-container" style={{ padding: '10px 5px', maxHeight: '550px', overflowY: 'auto' }}>
      {Object.entries(CONFIG).map(([key, { title }]) => (
        <details key={key} style={{ marginBottom: '24px' }}>
          <summary className="category-summary">{title}</summary>
          <div className="category-buttons">
            <button type="button" className="theButton" onClick={() => CONFIG[key].setter(store)([])}>Deselect All</button>
            <button type="button" className="theButton" onClick={() => CONFIG[key].setter(store)(CONFIG[key].hot)}>Set to Defaults</button>
          </div>
          <div className="check-grid">
            {todaysData[key].map((item) => {
              const checked = isItemChecked(item, key);
              return (
                <label key={item} className="theCheck" style={{
                  backgroundColor: checked ? 'var(--accent-bg, var(--bg-card))' : 'var(--bg-card)',
                  border: checked ? '1px solid #10B981' : '1px solid var(--border)',
                  boxShadow: checked ? '0 0 4px rgba(16, 185, 129, 0.2)' : 'none',
                }}>
                  <input type="checkbox" checked={checked} onChange={() => handleToggleItem(item, key)} className="check" />
                  <span style={{ color: checked ? 'var(--text-h)' : 'var(--text)', fontWeight: checked ? '600' : 'normal', opacity: checked ? 1 : 0.7 }}>
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
};

export default TrainerSelections;
