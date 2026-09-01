import React, { useMemo } from 'react';
import { HOT_TRAINERS, HOT_JOCKEYS, HOT_FOALED, HOT_OWNERS } from '../../utils/racingLogic';
import { useStore } from '../../store/alarmStore';
import '../../css/TrainerSelections.css';

// Safe parser that separates Dam, Broodmare Sire, and Sire explicitly
const parseFoaled = (str) => {
  if (!str) return { dam: '', broodmareSire: '', sire: '' };
  const match = str.match(/D:\s*(.*?)\s*\((.*?)\)\s*S:\s*(.*)/i);
  return match 
    ? { dam: match[1].trim(), broodmareSire: match[2].trim(), sire: match[3].trim() }
    : { dam: str.trim(), broodmareSire: '', sire: '' };
};

const CONFIG = {
  trainers:       { title: 'Trainers Today',         prop: 'trainer', hot: HOT_TRAINERS, setterName: 'setSelectedTrainers' },
  jockeys:        { title: 'Jockeys Today',          prop: 'jockey',  hot: HOT_JOCKEYS,  setterName: 'setSelectedJockeys' },
  owners:         { title: 'Owners Today',           prop: 'owner',   hot: HOT_OWNERS,   setterName: 'setSelectedOwners' },
  dams:           { title: 'Dams Today',             prop: 'foaled',  hot: HOT_FOALED,   setterName: 'setSelectedFoaled', isSubParent: 'dam' },
  broodmareSires: { title: 'Broodmare Sires Today',  prop: 'foaled',  hot: HOT_FOALED,   setterName: 'setSelectedFoaled', isSubParent: 'broodmareSire' },
  sires:          { title: 'Sires Today',            prop: 'foaled',  hot: HOT_FOALED,   setterName: 'setSelectedFoaled', isSubParent: 'sire' }
};

const CONFIG_ENTRIES = Object.entries(CONFIG);

const TrainerSelections = ({ races }) => {
  const trainers = useStore((s) => s.selectedTrainers);
  const jockeys = useStore((s) => s.selectedJockeys);
  const owners = useStore((s) => s.selectedOwners);
  const parents = useStore((s) => s.selectedFoaled);
  
  const setSelectedTrainers = useStore((s) => s.setSelectedTrainers);
  const setSelectedJockeys = useStore((s) => s.setSelectedJockeys);
  const setSelectedOwners = useStore((s) => s.setSelectedOwners);
  const setSelectedFoaled = useStore((s) => s.setSelectedFoaled);

  const store = {
    trainers, jockeys, owners, parents,
    setSelectedTrainers, setSelectedJockeys, setSelectedOwners, setSelectedFoaled
  };

  const { todaysData, tooltips } = useMemo(() => {
    const sets = { trainers: new Set(), jockeys: new Set(), owners: new Set(), dams: new Set(), broodmareSires: new Set(), sires: new Set() };
    const tooltipMap = {};

    const addMetadata = (key, value, horseName, raceTime, raceName) => {
      if (!value) return;
      if (!tooltipMap[key]) tooltipMap[key] = {};
      if (!tooltipMap[key][value]) tooltipMap[key][value] = [];
      // Prevent duplicating the exact same horse entry in the tooltip array
      const entry = `• ${horseName} (${raceTime} ${raceName})`;
      if (!tooltipMap[key][value].includes(entry)) {
        tooltipMap[key][value].push(entry);
      }
    };
    
    races?.forEach(race => {
      const raceTime = race.time || '';
      const raceName = race.name || '';

      race.horses?.forEach(horse => {
        const hName = horse.name || 'Unknown Horse';
        const tVal = horse.trainer?.trim();
        const jVal = horse.jockey?.trim();
        const oVal = horse.owner?.trim();

        if (tVal) { sets.trainers.add(tVal); addMetadata('trainers', tVal, hName, raceTime, raceName); }
        if (jVal) { sets.jockeys.add(jVal);  addMetadata('jockeys', jVal, hName, raceTime, raceName); }
        if (oVal) { sets.owners.add(oVal);   addMetadata('owners', oVal, hName, raceTime, raceName); }
        
        const rawFoaled = horse.foaled?.trim();
        if (rawFoaled) {
          const { dam, broodmareSire, sire } = parseFoaled(rawFoaled);
          if (dam) { sets.dams.add(dam); addMetadata('dams', dam, hName, raceTime, raceName); }
          if (broodmareSire) { sets.broodmareSires.add(broodmareSire); addMetadata('broodmareSires', broodmareSire, hName, raceTime, raceName); }
          if (sire) { sets.sires.add(sire); addMetadata('sires', sire, hName, raceTime, raceName); }
        }
      });
    });

    const sortedData = Object.fromEntries(
      Object.entries(sets).map(([k, set]) => [k, Array.from(set).sort((a, b) => a.localeCompare(b))])
    );

    return { todaysData: sortedData, tooltips: tooltipMap };
  }, [races]);

  const getSelectedArray = (key) => (CONFIG[key].isSubParent ? store.parents : store[key]);

  const isItemChecked = (item, key) => {
    const cfg = CONFIG[key];
    const selected = getSelectedArray(key);

    if (selected === null) {
      return cfg.hot.some(h => item.includes(h));
    }

    if (cfg.isSubParent) {
      return selected.some(comboString => {
        const parsed = parseFoaled(comboString);
        return parsed[cfg.isSubParent] === item;
      });
    }

    return selected.includes(item);
  };

  const handleToggleItem = (item, key) => {
    const cfg = CONFIG[key];
    const selected = getSelectedArray(key);
    const { setterName, hot } = cfg;

    const globalSourceData = races?.flatMap(r => r.horses?.map(h => h.foaled?.trim()).filter(Boolean)) || [];
    const uniqueFoaled = Array.from(new Set(globalSourceData));

    if (cfg.isSubParent) {
      const matchingCombos = uniqueFoaled.filter(f => parseFoaled(f)[cfg.isSubParent] === item);
      const current = selected === null ? uniqueFoaled.filter(t => hot.some(h => t.includes(h))) : [...selected];
      const isCurrentlyChecked = current.some(combo => parseFoaled(combo)[cfg.isSubParent] === item);

      const updated = isCurrentlyChecked
        ? current.filter(combo => parseFoaled(combo)[cfg.isSubParent] !== item)
        : Array.from(new Set([...current, ...matchingCombos]));

      store[setterName](updated);
    } else {
      const current = selected === null ? todaysData[key].filter(t => hot.some(h => t.includes(h))) : [...selected];
      store[setterName](current.includes(item) ? current.filter(i => i !== item) : [...current, item]);
    }
  };

  return (
    <div className="trainer-selections-container" style={{ padding: '10px 5px', maxHeight: '550px', overflowY: 'auto' }}>
      {CONFIG_ENTRIES.map(([key, { title, setterName, hot }]) => (
        <details key={key} style={{ marginBottom: '24px' }}>
          <summary className="category-summary">{title}</summary>
          <div className="category-buttons">
            <button type="button" className="theButton" onClick={() => store[setterName]([])}>Deselect All</button>
            <button type="button" className="theButton" onClick={() => store[setterName](hot)}>Set to Defaults</button>
          </div>
          <div className="check-grid">
            {todaysData[key].map((item) => {
              const checked = isItemChecked(item, key);
              
              // Key lookups are normalized directly to key strings ('trainers', 'jockeys', etc.)
              const lines = tooltips[key]?.[item] || [];
              const tooltipText = lines.length ? `Horses Today:\n${lines.join('\n')}` : '';

              return (
                <label key={item} className="theCheck" title={tooltipText} style={{
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
