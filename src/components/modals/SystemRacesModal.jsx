// src/components/SystemRacesModal.jsx
import React, { useState, useMemo } from 'react';

/**
 * SystemRacesModal Component
 * 
 * Displays a list of races filtered by a "Handicaps" keyword toggle, min/max runner sliders,
 * and a minimum past runs requirement for the horses.
 */
const SystemRacesModal = ({ races = [] }) => {
  // 1. Filter States
  const [onlyHandicaps, setOnlyHandicaps] = useState(false);
  const [minRestrict, setMinRestrict] = useState(0);
  const [maxRestrict, setMaxRestrict] = useState(0);
  const [minPastRuns, setMinPastRuns] = useState(0);

  // 2. Lock the absolute limits using useMemo so they remain stable during filtering
  const { absoluteMin, absoluteMax, absoluteMaxPastRuns } = useMemo(() => {
    const runnerCounts = races.map(race => Number(race.runners) || 0);
    const minRunners = runnerCounts.length > 0 ? Math.min(...runnerCounts) : 0;
    const maxRunners = runnerCounts.length > 0 ? Math.max(...runnerCounts) : 0;

    const allHorses = races.flatMap(race => race.horses || []);
    const pastRunCounts = allHorses.map(horse => Array.isArray(horse.past) ? horse.past.length : 0);
    const maxPastRuns = pastRunCounts.length > 0 ? Math.max(...pastRunCounts) : 0;

    return {
      absoluteMin: minRunners,
      absoluteMax: maxRunners,
      absoluteMaxPastRuns: maxPastRuns
    };
  }, [races]); // Only recalculates if the raw dataset changes, NOT when filtering happens

  // 3. Turn offsets back into concrete runner thresholds
  const currentMinFilter = absoluteMin + minRestrict;
  const currentMaxFilter = absoluteMax - maxRestrict;

  // Safely clamp slider values so boundaries never cross over
  const activeMin = Math.min(currentMinFilter, absoluteMax);
  const activeMax = Math.max(currentMaxFilter, activeMin);

  // 4. Combined Filtering Logic (Handicaps + Sliders + Horse Past Runs)
  const filteredRaces = races
    .map(race => {
      // Filter the individual horses within this race first based on their past runs array length
      const validHorses = (race.horses || []).filter(horse => {
        const runCount = Array.isArray(horse.past) ? horse.past.length : 0;
        return runCount >= minPastRuns;
      });

      // Return a copy of the race containing only the horses that meet the criteria
      return { ...race, horses: validHorses };
    })
    .filter(race => {
      // RULE: If we filter out all horses from a race, filter out that race entirely
      if (race.horses.length === 0) return false;

      // Runner count check (based on the original race data field)
      const count = Number(race.runners) || 0;
      const matchesSliders = count >= activeMin && count <= activeMax;

      // Handicap/Nursery keyword check
      let matchesHandicap = true;
      if (onlyHandicaps) {
        const detailText = String(race.detail || '').toLowerCase();
        matchesHandicap = detailText.includes('handicap') || detailText.includes('nursery');
      }

      return matchesSliders && matchesHandicap;
    });

  if (races.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'gray' }}>
        No races loaded to filter.
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* --- Filter Controls Panel --- */}
      <div style={{ paddingBottom: '12px', borderBottom: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* First Row Container: Handicaps + Runners Sliders */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

          {/* Handicaps Toggle Button */}
          <button
            onClick={() => setOnlyHandicaps(!onlyHandicaps)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85em',
              whiteSpace: 'nowrap',
              backgroundColor: onlyHandicaps ? '#0070f3' : 'transparent',
              color: onlyHandicaps ? '#ffffff' : 'inherit',
              transition: 'all 0.2s ease'
            }}
          >
            {onlyHandicaps ? '✓ Handicaps Only' : 'Handicaps'}
          </button>

          {/* Vertical Separator */}
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }} />

          {/* Min Runners Slider Group */}
          <div style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ whiteSpace: 'nowrap', fontSize: '0.9em', width: '75px' }}>
              Min: <strong>{activeMin}</strong>
            </label>
            <input
              type="range"
              min={absoluteMin}
              max={absoluteMax}
              value={activeMin}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMinRestrict(val - absoluteMin);
              }}
              style={{ flex: 1, cursor: 'pointer' }}
            />
          </div>

          {/* Middle Separator Line */}
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }} />

          {/* Max Runners Slider Group */}
          <div style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ whiteSpace: 'nowrap', fontSize: '0.9em', width: '75px' }}>
              Max: <strong>{activeMax}</strong>
            </label>
            <input
              type="range"
              min={absoluteMin}
              max={absoluteMax}
              value={activeMax}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMaxRestrict(absoluteMax - val);
              }}
              style={{ flex: 1, cursor: 'pointer' }}
            />
          </div>

        </div>

        {/* Second Row Container: Past Runs Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ whiteSpace: 'nowrap', fontSize: '0.9em', width: '175px' }}>
              Min Past Runs required: <strong>{minPastRuns}</strong>
            </label>
            <input
              type="range"
              min="0"
              max={absoluteMaxPastRuns}
              value={minPastRuns}
              onChange={(e) => setMinPastRuns(Number(e.target.value))}
              style={{ flex: 1, cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Match Count Footer */}
        <div style={{ fontSize: '0.8em', color: 'gray', marginTop: '4px', textAlign: 'right' }}>
          Showing {filteredRaces.length} of {races.length} races
        </div>
      </div>

      {/* --- Scrollable Race & Horse List --- */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filteredRaces.length === 0 ? (
          <p style={{ color: 'gray', textAlign: 'center', marginTop: '20px' }}>
            No races match your filter criteria.
          </p>
        ) : (
          filteredRaces.map((race, idx) => (
            <div key={idx} style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              {/* Race Header Block */}
              <div>
                <strong style={{ fontSize: '1.05em' }}>{race.place}</strong> – <span>{race.time}</span>
              </div>

              {race.detail && (
                <div style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic', margin: '2px 0' }}>
                  {race.detail}
                </div>
              )}

              <div style={{ fontSize: '0.85em', color: 'gray', marginBottom: '8px' }}>
                Runners: {race.runners}
              </div>

              {/* Nested Horse List */}
              <div style={{ paddingLeft: '8px', borderLeft: '2px solid #eaeaea', marginLeft: '2px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {race.horses.map((horse, horseIdx) => {
                    const totalRuns = Array.isArray(horse.past) ? horse.past.length : 0;
                    return (
                      <div key={horseIdx} style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(horse.number || horse.draw) && (
                          <span style={{ minWidth: '20px', color: '#666', fontWeight: '500' }}>
                            {horse.number || horse.draw}.
                          </span>
                        )}
                        <span>{horse.name}</span>

                        <span style={{ fontSize: '0.75em', color: 'gray', backgroundColor: '#f0f0f0', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>
                          {totalRuns} runs
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default SystemRacesModal;
