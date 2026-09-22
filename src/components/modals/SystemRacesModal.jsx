import React, { useMemo } from 'react';
import { useStore } from '../../store/store';
import '../../css/SystemRacesModal.css';

// Helper function to parse stones-pounds weight string (e.g., "9-7") to total pounds (lbs)
const parseWeightToLbs = (wStr) => {
  if (!wStr) return 0;
  if (typeof wStr === 'number') return wStr;
  const str = String(wStr).trim();
  const match = str.match(/(\d+)-(\d+)/);
  if (match) {
    return parseInt(match[1], 10) * 14 + parseInt(match[2], 10);
  }
  const val = parseInt(str, 10);
  return isNaN(val) ? 0 : val;
};

// Count how many past runs for a horse were at a strictly lighter weight than today
const getLighterPastRunsCount = (horse) => {
  const todayWeight = parseWeightToLbs(horse?.weight);
  if (todayWeight <= 0 || !Array.isArray(horse?.past)) return 0;
  return horse.past.filter(run => {
    const pastWeight = parseWeightToLbs(run?.weight);
    return pastWeight > 0 && pastWeight < todayWeight;
  }).length;
};

// Parse distance beaten string/number to lengths (e.g. 0 for winner, 0.25 for nk, 1.5 for 1 1/2)
// Helper to parse race distance strings like "1m 2f" into total furlongs (numeric)
const parseDistanceToFurlongs = (distStr) => {
  if (!distStr) return null;
  const parts = String(distStr).toLowerCase().trim().split(/\s+/);
  let totalFurlongs = 0;
  for (const part of parts) {
    if (part.endsWith('m')) {
      const miles = parseInt(part.slice(0, -1), 10);
      if (!isNaN(miles)) totalFurlongs += miles * 8; // 1 mile = 8 furlongs
    } else if (part.endsWith('f')) {
      const furlongs = parseInt(part.slice(0, -1), 10);
      if (!isNaN(furlongs)) totalFurlongs += furlongs;
    }
  }
  return totalFurlongs;
};
const parseDistBeaten = (run) => {
  if (!run) return null;
  const posStr = String(run.position || '').trim();
  const posNum = parseInt(posStr.split('/')[0], 10);
  if (posNum === 1) return 0;

  if (run.distBeaten === undefined || run.distBeaten === null || run.distBeaten === '') {
    return null;
  }

  if (typeof run.distBeaten === 'number') return run.distBeaten;

  const db = String(run.distBeaten).toLowerCase().trim();
  const abbrev = {
    'dh': 0,
    'ns': 0.05,
    'shd': 0.1,
    'hd': 0.2,
    'nk': 0.25
  };
  if (abbrev[db] !== undefined) return abbrev[db];

  const normalized = db
    .replace(/½/g, '.5')
    .replace(/¼/g, '.25')
    .replace(/¾/g, '.75')
    .trim();

  const fractionMatch = normalized.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1], 10) + (parseInt(fractionMatch[2], 10) / parseInt(fractionMatch[3], 10));
  }
  const simpleFraction = normalized.match(/^(\d+)\/(\d+)$/);
  if (simpleFraction) {
    return parseInt(simpleFraction[1], 10) / parseInt(simpleFraction[2], 10);
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
};

/**
 * SystemRacesModal Component
 * 
 * Displays a list of races filtered by a "Handicaps" keyword toggle, min/max runner sliders,
 * a minimum past runs requirement, past runs lighter than today, and distance beaten previously.
 */
const SystemRacesModal = ({ races = [] }) => {
  // 1. Filter States – using Zustand store
  const {
    onlyHandicaps,
    setOnlyHandicaps,
    minRestrict,
    setMinRestrict,
    maxRestrict,
    setMaxRestrict,
    minPastRuns,
    setMinPastRuns,
    maxLighterPastRuns,
    setMaxLighterPastRuns,
    distBeatenEnabled,
    setDistBeatenEnabled,
    maxDistBeaten,
    setMaxDistBeaten,
    distanceMargin,
    setDistanceMargin,
  } = useStore(state => state); // Directly return the store reference to cache the snapshot correctly


  // 2. Lock the absolute limits using useMemo so they remain stable during filtering
  const { absoluteMin, absoluteMax, absoluteMaxPastRuns, absoluteMaxLighterRuns } = useMemo(() => {
    const runnerCounts = races.map(race => Number(race.runners) || 0);
    const minRunners = runnerCounts.length > 0 ? Math.min(...runnerCounts) : 0;
    const maxRunners = runnerCounts.length > 0 ? Math.max(...runnerCounts) : 0;

    const allHorses = races.flatMap(race => race.horses || []);
    const pastRunCounts = allHorses.map(horse => Array.isArray(horse.past) ? horse.past.length : 0);
    const maxPastRuns = pastRunCounts.length > 0 ? Math.max(...pastRunCounts) : 0;

    const lighterCounts = allHorses.map(horse => getLighterPastRunsCount(horse));
    const maxLighter = lighterCounts.length > 0 ? Math.max(...lighterCounts) : 0;

    return {
      absoluteMin: minRunners,
      absoluteMax: maxRunners,
      absoluteMaxPastRuns: maxPastRuns,
      absoluteMaxLighterRuns: maxLighter
    };
  }, [races]); // Only recalculates if the raw dataset changes, NOT when filtering happens

  // 3. Turn offsets back into concrete runner thresholds
  const currentMinFilter = absoluteMin + minRestrict;
  const currentMaxFilter = absoluteMax - maxRestrict;

  // Safely clamp slider values so boundaries never cross over
  const activeMin = Math.min(currentMinFilter, absoluteMax);
  const activeMax = Math.max(currentMaxFilter, activeMin);

  // 4. Combined Filtering Logic (Handicaps + Sliders + Horse Past Runs + Lighter Past Runs)
  const filteredRaces = races
    .map(race => {
      // Filter individual horses within this race based on past runs and lighter past runs count
      const validHorses = (race.horses || []).filter(horse => {
        const runCount = Array.isArray(horse.past) ? horse.past.length : 0;
        const matchesPastRuns = runCount >= minPastRuns;

        const lighterCount = getLighterPastRunsCount(horse);
        // Horses that ran lighter than today on fewer than or equal to maxLighterPastRuns occasions
        const matchesLighterRuns = lighterCount <= maxLighterPastRuns && lighterCount > 0;


        // Distance beaten previously filter
        let matchesDistBeaten = true;
        if (distBeatenEnabled) {
          const prevRun = Array.isArray(horse.past) && horse.past.length > 0 ? horse.past[0] : null;
          const prevDist = parseDistBeaten(prevRun);
          matchesDistBeaten = prevDist !== null && prevDist <= maxDistBeaten;
        }

        // Distance margin filter – compare today race distance with past run distance
        let matchesDistance = true;
        if (distanceMargin >= 0) {
          const todayFurlongs = parseDistanceToFurlongs(race.distance);
          const prevRun = Array.isArray(horse.past) && horse.past.length > 0 ? horse.past[0] : null;
          const prevFurlongs = parseDistanceToFurlongs(prevRun?.distance);
          if (todayFurlongs !== null && prevFurlongs !== null) {
            matchesDistance = Math.abs(todayFurlongs - prevFurlongs) <= distanceMargin;
          }
        }

        return matchesPastRuns && matchesLighterRuns && matchesDistBeaten && matchesDistance;
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
      <div className="system-no-matches">
        No races loaded to filter.
      </div>
    );
  }

  return (
    <div className="system-modal-container">
      {/* --- Filter Controls Panel --- */}
      <div className="system-filters-panel">
        {/* First Row Container: Handicaps + Runners Sliders */}
        <div className="system-filter-row">
          {/* Handicaps Toggle Button */}
          <button
            onClick={() => setOnlyHandicaps(!onlyHandicaps)}
            className={`system-toggle-btn ${onlyHandicaps ? 'active' : ''}`}
          >
            {onlyHandicaps ? '✓ Handicaps Only' : 'Handicaps'}
          </button>

          {/* Vertical Separator */}
          <div className="system-separator" />

          {/* Min Runners Slider Group */}
          <div className="system-slider-group">
            <label className="system-slider-label short-label">
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
              className="system-range-input"
            />
          </div>

          {/* Middle Separator Line */}
          <div className="system-separator" />

          {/* Max Runners Slider Group */}
          <div className="system-slider-group">
            <label className="system-slider-label short-label">
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
              className="system-range-input"
            />
          </div>
        </div>

        {/* Second Row Container: Past Runs Filter */}
        <div className="system-filter-row">
          <div className="system-slider-group">
            <label className="system-slider-label wide-label">
              Min Past Runs required: <strong>{minPastRuns}</strong>
            </label>
            <input
              type="range"
              min="0"
              max={absoluteMaxPastRuns}
              value={minPastRuns}
              onChange={(e) => setMinPastRuns(Number(e.target.value))}
              className="system-range-input"
            />
          </div>
        </div>

        {/* Third Row Container: Number of past runs lighter than today */}
        <div className="system-filter-row">
          <div className="system-slider-group">
            <label className="system-slider-label wider-label">
              Number of past runs lighter than today: <strong>{maxLighterPastRuns}</strong>{' '}
              <span style={{ opacity: 0.85 }}>
                {maxLighterPastRuns === 0
                  ? '(on 0 past occasions - never lighter)'
                  : `(on fewer than or equal to ${maxLighterPastRuns} past occasion${maxLighterPastRuns === 1 ? '' : 's'})`}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max={Math.max(absoluteMaxLighterRuns, 1)}
              value={maxLighterPastRuns}
              onChange={(e) => setMaxLighterPastRuns(Number(e.target.value))}
              className="system-range-input"
            />
            {/* Distance margin filter */}
            <div className="system-slider-group" style={{ marginLeft: '12px' }}>
              <label className="system-slider-label wider-label">
                Distance match ± furlongs: <strong>{distanceMargin}</strong>
              </label>
              <input
                type="range"
                min="0"
                max="5"
                value={distanceMargin}
                onChange={(e) => setDistanceMargin(Number(e.target.value))}
                className="system-range-input"
              />
            </div>
          </div>
        </div>

        {/* Fourth Row Container: Distance Beaten Previously Filter */}
        <div className="system-filter-row">
          <button
            onClick={() => setDistBeatenEnabled(!distBeatenEnabled)}
            className={`system-toggle-btn ${distBeatenEnabled ? 'active' : ''}`}
            title="Toggle distance beaten filter"
          >
            {distBeatenEnabled ? '✓ Dist Beaten Active' : 'Dist Beaten (Off)'}
          </button>

          <div className="system-separator" />

          <div className="system-slider-group">
            <label className="system-slider-label wider-label">
              Distance beaten previously: <strong>{maxDistBeaten} lengths</strong>{' '}
              <span style={{ opacity: 0.85 }}>
                {!distBeatenEnabled
                  ? '(Off)'
                  : maxDistBeaten === 0
                    ? '(winners only)'
                    : `(≤ ${maxDistBeaten} lengths)`}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={maxDistBeaten}
              onChange={(e) => {
                setMaxDistBeaten(Number(e.target.value));
                if (!distBeatenEnabled) setDistBeatenEnabled(true);
              }}
              className="system-range-input"
            />
          </div>
        </div>

        {/* Match Count Footer */}
        <div className="system-match-footer">
          Showing {filteredRaces.length} of {races.length} races
        </div>
      </div>

      {/* --- Scrollable Race & Horse List --- */}
      <div className="system-races-list">
        {filteredRaces.length === 0 ? (
          <p className="system-no-matches">
            No races match your filter criteria.
          </p>
        ) : (
          filteredRaces.map((race, idx) => (
            <div key={idx} className="system-race-card">
              {/* Race Header Block */}
              <div className="system-race-header">
                <strong>{race.place}</strong> – <span>{race.time}</span>
              </div>

              {race.detail && (
                <div className="system-race-detail">
                  {race.detail}
                </div>
              )}

              <div className="system-race-runners">
                Runners: {race.runners}
              </div>

              {/* Nested Horse List */}
              <div className="system-horse-list">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {race.horses.map((horse, horseIdx) => {
                    const totalRuns = Array.isArray(horse.past) ? horse.past.length : 0;
                    const lighterRuns = getLighterPastRunsCount(horse);
                    const prevRun = totalRuns > 0 ? horse.past[0] : null;
                    const prevDist = parseDistBeaten(prevRun);
                    return (
                      <div key={horseIdx} className="system-horse-item">
                        {(horse.number || horse.draw) && (
                          <span className="system-horse-num">
                            {horse.number || horse.draw}.
                          </span>
                        )}
                        <strong className="system-horse-name">{horse.name}</strong>

                        {horse.weight && (
                          <span className="system-badge-weight">
                            Wt: {horse.weight}
                          </span>
                        )}

                        <span className="system-badge-runs">
                          {totalRuns} runs
                        </span>

                        <span className={`system-badge-lighter ${lighterRuns > 0 ? 'has-lighter' : 'no-lighter'}`}>
                          {lighterRuns} lighter {lighterRuns === 1 ? 'run' : 'runs'}
                        </span>

                        {prevRun && (
                          <span className={`system-badge-dist-beaten ${prevDist === 0 ? 'won' : ''}`}>
                            {prevDist === 0
                              ? 'Won prev'
                              : prevDist !== null
                                ? `Prev btn: ${prevRun.distBeaten || prevDist}L`
                                : 'Prev: unplaced'}
                          </span>
                        )}
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
