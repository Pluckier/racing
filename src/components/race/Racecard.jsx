import React, { useState, useMemo, useEffect } from 'react';
import HorseRow from './HorseRow';
import FormChart from '../charts/FormChart';
import OddsChart from '../charts/OddsChart';
import Modal from '../common/Modal';
import '../../css/RaceCard.css';
import { useStore } from '../../store/alarmStore';

const SORT_MODES = ['odds', 'last', 'avg', 'all', 'high'];
const SORT_LABELS = {
  odds: 'Odds',
  avg: 'Avg 3',
  last: '1 Run',
  high: 'High',
  all: 'All'
};

const RaceCard = ({ race, allRaces = [], highlightFiddles, highlightValues, highlightSelects, isAlarmEnabled, onToggleAlarm, viewMode, currentDateStr }) => {
  const [showChart, setShowChart] = useState(false);
  const [showOdds, setShowOdds] = useState(false);
  const [sortBy, setSortBy] = useState('avg');
  const [activeChartRace, setActiveChartRace] = useState(race);

  const aiMode = useStore((state) => state.aiMode);
  const toggleAi = useStore((state) => state.toggleAi);

  // Math.min(horse.past?.length || 0, 6) caps each individual horse at 6
  const totalPastRuns = race.horses?.reduce((acc, horse) => acc + Math.min(horse.past?.length || 0, 6), 0) || 0;
  const maxPossibleRuns = (race.horses?.length || 0) * 6;

  // 1. Calculate percentage as a number
  const formPercentage = maxPossibleRuns > 0
    ? Math.round((totalPastRuns / maxPossibleRuns) * 100)
    : 0;

  // 2. Determine which emoji to use based on the tier
  let emoji = "";

  if (formPercentage >= 0 && formPercentage <= 33) {
    emoji = " ❌";
  } else if (formPercentage >= 34 && formPercentage <= 55) {
    emoji = " ⚠️";
  } else if (formPercentage >= 56 && formPercentage <= 74) {
    emoji = " 👎";
  } else if (formPercentage >= 75 && formPercentage <= 87) {
    emoji = " 👍";
  } else if (formPercentage >= 88 && formPercentage <= 99) {
    emoji = " 👌";
  } else if (formPercentage === 100) {
    emoji = " ✅💯";
  }

  // 3. Create final output string
  const finalDisplay = `${formPercentage}%${emoji}`;


  const getAvg = (h) => {
    const past = h.past || [];
    const last3 = past.slice(0, 3);
    if (last3.length === 0) return 0;
    return last3.reduce((acc, r) => acc + getRating(r), 0) / last3.length;
  };

  const getRating = (run) => {
    if (!run) return 0;
    const targetProperty = aiMode === 2 ? run.name2AI : aiMode === 1 ? run.nameAI : run.name;
    return Number(targetProperty) || 0;
  };


  const getMax = (h) => {
    const past = h.past || [];
    if (past.length === 0) return 0;
    return Math.max(...past.map(r => getRating(r)));
  };

  const getLast = (h) => {
    const past = h.past || [];
    return past.length > 0 ? (getRating(past[0]) || 0) : 0;
  };

  const getAllAvg = (h) => {
    const past = h.past || [];
    if (past.length === 0) return 0;
    return past.reduce((acc, r) => acc + getRating(r), 0) / past.length;
  };

  const getLatestOdds = (h) => {
    const odds = h.odds || [];
    const last = odds[odds.length - 1];
    return (last && last !== "null" && last !== "NR" && !isNaN(last)) ? parseFloat(last) : Infinity;
  };

  const sortedHorses = useMemo(() =>
    [...race.horses].sort((a, b) => {
      const isNRA = getLatestOdds(a) === Infinity;
      const isNRB = getLatestOdds(b) === Infinity;

      // Always push non-runners to the bottom
      if (isNRA !== isNRB) return isNRA ? 1 : -1;

      if (sortBy === 'avg') return getAvg(b) - getAvg(a);
      if (sortBy === 'high') return getMax(b) - getMax(a);
      if (sortBy === 'last') return getLast(b) - getLast(a);
      if (sortBy === 'all') return getAllAvg(b) - getAllAvg(a);
      if (sortBy === 'odds') return getLatestOdds(a) - getLatestOdds(b);
      return Number(a.number) - Number(b.number);
    }),
    [race.horses, sortBy, aiMode]
  );

  const valueRunnersRanked = useMemo(() => {
    if (!highlightValues) return new Map();
    const runners = race.horses.filter(h => h.isValue);
    const uniqueRatings = [...new Set(runners.map(getMax))].sort((a, b) => b - a);

    const ranks = new Map();
    runners.forEach(h => {
      const rtg = getMax(h);
      const horseId = h.number === 'NR' ? h.name : h.number;
      if (rtg === uniqueRatings[0]) ranks.set(horseId, 'top');
      else if (rtg === uniqueRatings[1]) ranks.set(horseId, 'second');
    });
    return ranks;
  }, [race.horses, highlightValues, aiMode]);

  const massiveSpikeHorseNumber = useMemo(() => {
    const activeRunners = race.horses.filter(h => getLatestOdds(h) !== Infinity);
    if (activeRunners.length < 2) return null;
    const sortedByPeak = [...activeRunners].sort((a, b) => getMax(b) - getMax(a));
    const topPeak = getMax(sortedByPeak[0]);
    const nextPeak = getMax(sortedByPeak[1]);
    const winner = sortedByPeak[0];

    // Find the race where the peak rating occurred to ensure it was a competitive effort
    const peakRun = (winner.past || []).find(p => getRating(p) === topPeak);
    let peakDistValid = false;

    if (peakRun) {
      const peakPos = parseInt(peakRun.position?.toString().split('/')[0], 10) || 0;
      peakDistValid = peakPos === 1;

      if (!peakDistValid && peakRun.distBeaten) {
        const db = peakRun.distBeaten.toString().toLowerCase().trim();
        const abbrev = ['shd', 'hd', 'nk', 'ns', 'dh'];
        if (abbrev.includes(db)) {
          peakDistValid = true;
        } else {
          const dNum = parseFloat(db);
          peakDistValid = !isNaN(dNum) && dNum < 2;
        }
      }
    }

    return (topPeak > 0 && topPeak >= nextPeak * 1.9 && peakDistValid) ? (winner.number === 'NR' ? winner.name : winner.number) : null;
  }, [race.horses, aiMode]);

  const selectHorseNumber = useMemo(() => {
    // 1. Filter out Non-Runners and invalid odds immediately
    const activeRunners = race?.horses?.filter(h =>
      h.number !== 'NR' &&
      getLatestOdds(h) !== Infinity
    ) || [];

    if (activeRunners.length === 0) return null;

    // 2. Find the horse with the highest getLast value
    const winner = [...activeRunners].sort((a, b) => getLast(b) - getLast(a))[0];

    // 3. Return the winning horse's number
    return winner.number === 'NR' ? winner.name : winner.number;
  }, [race.horses, aiMode]);


  const getRaceIcon = (r) => {
    if (!r) return '';
    const d = (r.detail || '').toLowerCase();
    const isH = d.includes('handicap') || d.includes('nursery');
    const isC1 = d.includes('class 1') || d.includes('class 2');
    const count = r.horses?.length || 0;

    const icons = [];
    if (isC1) icons.push('👑');
    if (isH) icons.push('⚖️');
    if ((isH || isC1) && count >= 8) icons.push('🏆');

    return icons.length > 0 ? icons.join(' ') : '🚫';
  };

  const raceId = `${race.time}${race.place.replace(/\s+/g, '')}`;

  // Navigation logic for the FormChart Modal
  const currentIndex = allRaces.findIndex(r => r.time === activeChartRace.time && r.place === activeChartRace.place);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allRaces.length - 1 && currentIndex !== -1;

  const handlePrev = () => {
    if (hasPrev) {
      const prevRace = allRaces[currentIndex - 1];
      setActiveChartRace(prevRace);
      window.location.hash = `${currentDateStr}@${prevRace.time}${prevRace.place.replace(/\s+/g, '')}`;
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextRace = allRaces[currentIndex + 1];
      setActiveChartRace(nextRace);
      window.location.hash = `${currentDateStr}@${nextRace.time}${nextRace.place.replace(/\s+/g, '')}`;
    }
  };

  const openChart = () => {
    setActiveChartRace(race); // Reset to this card's race when opening
    setShowChart(true);
  };

  const CpuIcon = () => (
    <svg xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
    </svg>
  );

  const ClaudeIcon = () => (
    <svg xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a1 1 0 0 1 1 1v4.757l3.364-3.364a1 1 0 1 1 1.414 1.414L14.414 9H19a1 1 0 1 1 0 2h-4.757l3.364 3.364a1 1 0 0 1-1.414 1.414L13 12.414V17a1 1 0 1 1-2 0v-4.757l-3.364 3.364a1 1 0 0 1-1.414-1.414L9.586 11H5a1 1 0 1 1 0-2h4.757L6.393 5.636a1 1 0 0 1 1.414-1.414L11 7.586V3a1 1 0 0 1 1-1z" />
    </svg>
  );

  const ChatGptIcon = () => (
    <svg xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.74 11.63a4.19 4.19 0 0 0-.25-1.57 4.29 4.29 0 0 0-.85-1.34 4.39 4.39 0 0 0-1.34-.85A4.6 4.6 0 0 0 16.32 7a4.41 4.41 0 0 0-2.84 1 4.54 4.54 0 0 0-1.48 2.37 4.62 4.62 0 0 0-2.48-.68 4.4 4.4 0 0 0-3.18 1.34 4.51 4.51 0 0 0-1.12 4.48 4.19 4.19 0 0 0 .25 1.57 4.29 4.29 0 0 0 .85 1.34 4.39 4.39 0 0 0 1.34.85A4.31 4.31 0 0 0 11 18.2a4.4 4.4 0 0 0 2.84-1A4.54 4.54 0 0 0 15.32 15a4.62 4.62 0 0 0 2.48.68 4.4 4.4 0 0 0 3.18-1.34 4.51 4.51 0 0 0 .76-2.71zm-9.35 4a2.43 2.43 0 0 1-1.63-.61l3.52-2a.45.45 0 0 0 .23-.39V8.65a2.53 2.53 0 0 1 1.15 2.15 2.56 2.56 0 0 1-2.52 2.53zm-5.63-2.61a2.45 2.45 0 0 1 .42-1.69l3.52 2a.46 4.46 0 0 0 .45 0l3.94-2.27v1a2.53 2.53 0 0 1-1.87 2.44 2.56 2.56 0 0 1-2.89-1l-3.57-2.05zm.88-5.32A2.43 2.43 0 0 1 9.27 7a2.53 2.53 0 0 1 2.3 1.49l-3.52 2a.45.45 0 0 0-.23.39v4A2.53 2.53 0 0 1 6.68 12a2.56 2.56 0 0 1 1-2.31zM16.32 9a2.43 2.43 0 0 1 1.63.61l-3.52 2a.45.45 0 0 0-.23.39v4a2.53 2.53 0 0 1-1.15-2.15A2.56 2.56 0 0 1 15.57 11.3a2.54 2.54 0 0 1 .75-.3zm5.63 2.61a2.45 2.45 0 0 1-.42 1.69l-3.52-2a.46 4.46 0 0 0-.45 0l-3.94 2.27v-1a2.53 2.53 0 0 1 1.87-2.44 2.56 2.56 0 0 1 2.89 1z" />
    </svg>
  );

  // 2. Updated clean mapping object utilizing the local SVG components
  const aiButtonConfig = {
    0: { icon: <CpuIcon />, color: '#374151', title: "Turn on AI" },
    1: { icon: <ClaudeIcon />, color: '#F59E0B', title: "Using Claude" },
    2: { icon: <ChatGptIcon />, color: '#10B981', title: "Using ChatGPT" }
  };

  const currentConfig = aiButtonConfig[aiMode] || aiButtonConfig[0];


  return (
    <div id={raceId} className="race-card">
      <header className="race-header">
        <div className="race-title-group">
          <h2 className="race-title">
            <a href="#home" className="home-link" title="Return to top">
              🏠
            </a>
            <button
              onClick={onToggleAlarm}
              title={isAlarmEnabled ? "Alarm active (4 mins before start)" : "Click to set alarm for this race"}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                marginRight: '10px',
                padding: 0,
                verticalAlign: 'middle',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                filter: isAlarmEnabled ? 'drop-shadow(0 0 5px #ffcc00) brightness(1.1)' : 'grayscale(1) opacity(0.3)',
                transform: isAlarmEnabled ? 'scale(1.15)' : 'scale(1)'
              }}
            >
              🔔
            </button>
            <a href={`#${raceId}`} className="race-title-link">
              {race.time} {race.place}
            </a>

          </h2>
          <h5 className="race-detail">{getRaceIcon(race)} {race.detail} {race.going} (Runners {race.runners}) FORM:{finalDisplay}</h5>
        </div>
        <div className="race-controls">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '2px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            fontSize: '13px'
          }}>
            <span>{SORT_LABELS[sortBy]}</span>
            <input
              type="range"
              min="0"
              max={SORT_MODES.length - 1}
              step="1"
              value={SORT_MODES.indexOf(sortBy)}
              onChange={(e) => setSortBy(SORT_MODES[parseInt(e.target.value, 10)])}
              style={{ width: '70px', cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
          </div>
          <button
            onClick={() => toggleAi()}
            className="race-analytics-btn"
            title={currentConfig.title}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',

              // 1. Force explicit dimensions so the button never shrinks or jumps shapes
              width: '42px',
              height: '42px',

              backgroundColor: currentConfig.color,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              padding: '0' // Clear padding since width/height handle sizing now
            }}
          >
            <span style={{
              fontSize: '1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%'
            }}>
              {currentConfig.icon}
            </span>
          </button>
          <button onClick={() => setShowOdds(!showOdds)} className="race-analytics-btn" title="View Odds Movement">
            <span style={{ fontSize: '1.5rem' }}>📊</span>
          </button>
          <button onClick={openChart} className="race-analytics-btn" title="View Past Performance Chart">
            <span style={{ fontSize: '1.5rem' }}>📈</span>
          </button>
        </div>
      </header>

      <Modal
        isOpen={showOdds}
        onClose={() => setShowOdds(false)}
        title={`Odds Movement: ${race.time} ${race.place}`}
      >
        <OddsChart horses={race.horses} />
      </Modal>

      <Modal
        isOpen={showChart}
        onClose={() => setShowChart(false)}
        title={`${activeChartRace.time} ${activeChartRace.place} - ${getRaceIcon(activeChartRace)} ${activeChartRace.detail} ${activeChartRace.going} (Runners ${activeChartRace.runners})`}
      >
        <FormChart
          horses={activeChartRace.horses}
          raceTime={activeChartRace.time}
          racePlace={activeChartRace.place}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={hasNext}
          hasPrev={hasPrev}
          todayDistance={activeChartRace.distance}
          todayGoing={activeChartRace.going}
          viewMode={viewMode} // Pass down viewMode
          currentDateStr={currentDateStr} // Pass down currentDateStr
        />
      </Modal>

      <div className="entries">
        {sortedHorses.map(horse => {
          const horseId = horse.number === 'NR' ? horse.name : horse.number;
          const rank = valueRunnersRanked.get(horseId);
          const isMassive = horseId === massiveSpikeHorseNumber;
          const isValue = highlightValues && horse.isValue;
          const isSelect = highlightSelects && horseId === selectHorseNumber;

          return (
            <HorseRow
              key={`${horse.name}-${horse.number}`}
              horse={horse}
              sortBy={sortBy}
              highlightFiddle={highlightFiddles && horse.isFiddle}
              highlightValue={
                isMassive && isValue ? 'massive' :
                  rank
              }
              highlightSelect={isSelect}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RaceCard;