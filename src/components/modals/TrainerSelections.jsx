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
  trainers:       { title: 'Trainers Today',         prop: 'trainer', hot: HOT_TRAINERS, setterName: 'setSelectedTrainers',     storeKey: 'trainers' },
  jockeys:        { title: 'Jockeys Today',          prop: 'jockey',  hot: HOT_JOCKEYS,  setterName: 'setSelectedJockeys',      storeKey: 'jockeys' },
  owners:         { title: 'Owners Today',           prop: 'owner',   hot: HOT_OWNERS,   setterName: 'setSelectedOwners',       storeKey: 'owners' },
  dams:           { title: 'Dams Today',             prop: 'foaled',  hot: HOT_FOALED,   setterName: 'setSelectedDams',         storeKey: 'dams',           isSubParent: 'dam' },
  broodmareSires: { title: 'Broodmare Sires Today',  prop: 'foaled',  hot: HOT_FOALED,   setterName: 'setSelectedBroodmareSires', storeKey: 'broodmareSires', isSubParent: 'broodmareSire' },
  sires:          { title: 'Sires Today',            prop: 'foaled',  hot: HOT_FOALED,   setterName: 'setSelectedSires',          storeKey: 'sires',          isSubParent: 'sire' }
};

const CONFIG_ENTRIES = Object.entries(CONFIG);

const TrainerSelections = ({ races }) => {
  // Bind directly to global individual tracks in Zustand
  const trainers = useStore((s) => s.selectedTrainers);
  const jockeys = useStore((s) => s.selectedJockeys);
  const owners = useStore((s) => s.selectedOwners);
  const dams = useStore((s) => s.selectedDams);
  const broodmareSires = useStore((s) => s.selectedBroodmareSires);
  const sires = useStore((s) => s.selectedSires);
  
  const setSelectedTrainers = useStore((s) => s.setSelectedTrainers);
  const setSelectedJockeys = useStore((s) => s.setSelectedJockeys);
  const setSelectedOwners = useStore((s) => s.setSelectedOwners);
  const setSelectedDams = useStore((s) => s.setSelectedDams);
  const setSelectedBroodmareSires = useStore((s) => s.setSelectedBroodmareSires);
  const setSelectedSires = useStore((s) => s.setSelectedSires);

  const store = {
    trainers, jockeys, owners, dams, broodmareSires, sires,
    setSelectedTrainers, setSelectedJockeys, setSelectedOwners, setSelectedDams, setSelectedBroodmareSires, setSelectedSires
  };

  // Build lookups for today's active items and parsed lineage maps
  const { todaysData, tooltips, bloodlineConnections } = useMemo(() => {
    const sets = { trainers: new Set(), jockeys: new Set(), owners: new Set(), dams: new Set(), broodmareSires: new Set(), sires: new Set() };
    const tooltipMap = {};
    const connections = [];

    const addMetadata = (key, value, horseName, raceTime, raceName) => {
      if (!value) return;
      if (!tooltipMap[key]) tooltipMap[key] = {};
      if (!tooltipMap[key][value]) tooltipMap[key][value] = [];
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
          const parsed = parseFoaled(rawFoaled);
          // Attach the original string so default matching works natively
          connections.push({ raw: rawFoaled, ...parsed });
          
          if (parsed.dam) { sets.dams.add(parsed.dam); addMetadata('dams', parsed.dam, hName, raceTime, raceName); }
          if (parsed.broodmareSire) { sets.broodmareSires.add(parsed.broodmareSire); addMetadata('broodmareSires', parsed.broodmareSire, hName, raceTime, raceName); }
          if (parsed.sire) { sets.sires.add(parsed.sire); addMetadata('sires', parsed.sire, hName, raceTime, raceName); }
        }
      });
    });

    const sortedData = Object.fromEntries(
      Object.entries(sets).map(([k, set]) => [k, Array.from(set).sort((a, b) => a.localeCompare(b))])
    );

    return { todaysData: sortedData, tooltips: tooltipMap, bloodlineConnections: connections };
  }, [races]);

  const getSelectedArray = (key) => store[CONFIG[key].storeKey];

  const getItemSelectionState = (item, key) => {
    const cfg = CONFIG[key];
    const selected = getSelectedArray(key);

    // 1. Resolve Explicit Green Selection Checks First
    let isChecked = false;
    if (selected === null) {
      isChecked = cfg.hot.some(h => item.includes(h));
    } else {
      isChecked = selected.includes(item);
    }

    if (isChecked) {
      return { checked: true, highlighted: false };
    }

    // Only process pink family highlight linking for lineage sub-parents
    if (!cfg.isSubParent) {
      return { checked: false, highlighted: false };
    }

    // 2. Pink Highlight Evaluation: Check if any other relation in this horse's combo is active
    const hasActiveRelative = bloodlineConnections.some(conn => {
      // Ensure this connection row matches the specific name item being evaluated
      if (conn[cfg.isSubParent] !== item) return false;

      // Check if Dam is currently checked (either manually or via global defaults match)
      const isDamActive = store.dams === null 
        ? CONFIG.dams.hot.some(h => conn.raw.includes(h))
        : store.dams.includes(conn.dam);

      // Check if Broodmare Sire is currently checked
      const isBMSireActive = store.broodmareSires === null
        ? CONFIG.broodmareSires.hot.some(h => conn.raw.includes(h))
        : store.broodmareSires.includes(conn.broodmareSire);

      // Check if Sire is currently checked
      const isSireActive = store.sires === null
        ? CONFIG.sires.hot.some(h => conn.raw.includes(h))
        : store.sires.includes(conn.sire);

      return isDamActive || isBMSireActive || isSireActive;
    });

    if (hasActiveRelative) {
      return { checked: false, highlighted: true };
    }

    return { checked: false, highlighted: false };
  };

  const handleToggleItem = (item, key) => {
    const cfg = CONFIG[key];
    const selected = getSelectedArray(key);
    const { setterName, hot } = cfg;

    let current;
    if (selected === null) {
      current = todaysData[key].filter(i => hot.some(h => i.includes(h)));
    } else {
      current = [...selected];
    }

    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];

    store[setterName](updated, races);
  };



   return (
    <div className="trainer-selections-container" style={{ padding: '10px 5px', maxHeight: '550px', overflowY: 'auto' }}>
      {CONFIG_ENTRIES.map(([key, { title, setterName, hot, isSubParent }]) => (
        <details key={key} style={{ marginBottom: '24px' }}>
          <summary className="category-summary">{title}</summary>
          <div className="category-buttons">
            <button type="button" className="theButton" onClick={() => store[setterName]([], races)}>
              Deselect All
            </button>
            <button type="button" className="theButton" onClick={() => {
              if (isSubParent) {
                // Set default individual values extracted from hot strings rules
                const restoredDefaults = todaysData[key].filter(item => hot.some(h => item.includes(h)));
                store[setterName](restoredDefaults, races);
              } else {
                store[setterName](hot, races);
              }
            }}>
              Set to Defaults
            </button>
          </div>
          <div className="check-grid">
            {todaysData[key].map((item) => {
              const { checked, highlighted } = getItemSelectionState(item, key);
              const lines = tooltips[key]?.[item] || [];
              const tooltipText = lines.length ? `Horses Today:\n${lines.join('\n')}` : '';

              let bgColor = 'var(--bg-card)';
              let borderColor = 'var(--border)';
              let shadow = 'none';

              if (checked) {
                bgColor = 'var(--accent-bg, var(--bg-card))';
                borderColor = '#10B981'; // Green Checked Border
                shadow = '0 0 4px rgba(16, 185, 129, 0.2)';
              } else if (highlighted) {
                bgColor = '#FFF0F5'; // Soft Pink background tint
                borderColor = '#FF69B4'; // Hot Pink relation border
                shadow = '0 0 4px rgba(255, 105, 180, 0.2)';
              }

              return (
                <label key={item} className="theCheck" title={tooltipText} style={{
                  backgroundColor: bgColor,
                  border: `1px solid ${borderColor}`,
                  boxShadow: shadow,
                  transition: 'all 0.2s ease-in-out'
                }}>
                  <input 
                    type="checkbox" 
                    checked={checked} 
                    onChange={() => handleToggleItem(item, key)} 
                    className="check" 
                  />
                  <span style={{ 
                    color: checked ? 'var(--text-h)' : highlighted ? '#C71585' : 'var(--text)', 
                    fontWeight: (checked || highlighted) ? '600' : 'normal', 
                    opacity: (checked || highlighted) ? 1 : 0.7 
                  }}>
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
