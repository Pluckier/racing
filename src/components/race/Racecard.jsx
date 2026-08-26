import React, { useState, useMemo, useEffect } from 'react';
import HorseRow from './HorseRow';
import FormChart from '../charts/FormChart';
import OddsChart from '../charts/OddsChart';
import Modal from '../common/Modal';
import '../../css/RaceCard.css';
import { useStore } from '../../store/alarmStore';
import ThreeSliders from '../charts/Sliders';

const SORT_MODES = ['odds', 'last', 'avg', 'all', 'high'];
const SORT_LABELS = {
  odds: 'Odds',
  avg: 'Avg3',
  last: '1Run',
  high: 'High',
  all: 'All'
};

const RaceCard = ({ race, allRaces = [], highlightFiddles, highlightValues, highlightSelects, isAlarmEnabled, onToggleAlarm, viewMode, currentDateStr }) => {
  const [showChart, setShowChart] = useState(false);
  const [showOdds, setShowOdds] = useState(false);
  const [sortBy, setSortBy] = useState('avg');
  const [activeChartRace, setActiveChartRace] = useState(race);

  const aiMode = useStore((store) => store.aiMode);
  const toggleAi = useStore((store) => store.toggleAi);
  const wValue = useStore((store) => store.wValue);
  const dValue = useStore((store) => store.dValue);
  const gValue = useStore((store) => store.gValue);
  const setW = useStore((store) => store.setW);
  const setD = useStore((store) => store.setD);
  const setG = useStore((store) => store.setG);

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


  const getRating = (run) => {
    if (!run) return 0;
    const targetProperty = aiMode === 2 ? run.name2AI : aiMode === 1 ? run.nameAI : run.name;
    return Number(targetProperty) || 0;
  };

  const parseDistanceToFurlongs = (distStr) => {
    if (!distStr || typeof distStr !== 'string') return 0;
    let total = 0;
    const mMatch = distStr.match(/(\d+)m/);
    const fMatch = distStr.match(/(\d+)f/);
    const yMatch = distStr.match(/(\d+)y/);
    if (mMatch) total += parseInt(mMatch[1], 10) * 8;
    if (fMatch) total += parseInt(fMatch[1], 10);
    if (yMatch) total += Math.round(parseInt(yMatch[1], 10) / 220);
    return total;
  };

  const parseWeightToLbs = (wStr) => {
    if (!wStr) return 0;
    if (typeof wStr === 'number') return wStr;
    const parts = wStr.toString().split('-');
    if (parts.length === 2) return (parseInt(parts[0], 10) * 14) + parseInt(parts[1], 10);
    return parseInt(wStr, 10) || 0;
  };

  // Applies the same W/D/G bonus formula as FormChart and HorseRow
  const getAdjustedRating = (horse, run) => {
    const baseRating = getRating(run);
    if (!baseRating) return 0;
    let totalBonus = 0;

    // W — Weight turnaround
    const todayWeightLbs = parseWeightToLbs(horse?.weight);
    const pastWeightLbs = parseWeightToLbs(run?.weight);
    if (pastWeightLbs > 0 && todayWeightLbs > 0) {
      const weightDiff = Math.abs(pastWeightLbs - todayWeightLbs);
      const weightFactor = Math.pow(wValue / 100, 4);
      if (todayWeightLbs < pastWeightLbs) {
        totalBonus += baseRating * (weightFactor * 0.30) * weightDiff;
      } else if (todayWeightLbs > pastWeightLbs) {
        totalBonus -= baseRating * (weightFactor * 0.01) * weightDiff;
      }
    }

    // D — Distance match (within 20% tolerance)
    const todayFurlongs = parseDistanceToFurlongs(race.distance);
    const raceFurlongs = parseDistanceToFurlongs(run?.distance);
    if (todayFurlongs > 0 && raceFurlongs > 0) {
      if (Math.abs(todayFurlongs - raceFurlongs) <= todayFurlongs * 0.20) {
        totalBonus += baseRating * dValue;
      }
    }

    // G — Going match
    const cleanPastGoing = (run?.going || '').trim().toLowerCase();
    const cleanTodayGoing = (race.going || '').trim().toLowerCase();
    if (cleanPastGoing && cleanTodayGoing) {
      if (cleanPastGoing === cleanTodayGoing) {
        totalBonus += baseRating * gValue;
      } else if (cleanPastGoing.includes(cleanTodayGoing) || cleanTodayGoing.includes(cleanPastGoing)) {
        totalBonus += baseRating * (gValue / 2);
      } else {
        totalBonus -= baseRating * gValue * 0.2;
      }
    }

    return baseRating + totalBonus;
  };

  const getAvg = (h) => {
    const past = h.past || [];
    const last3 = past.slice(0, 3);
    if (last3.length === 0) return 0;
    return last3.reduce((acc, r) => acc + getAdjustedRating(h, r), 0) / last3.length;
  };

  const getMax = (h) => {
    const past = h.past || [];
    if (past.length === 0) return 0;
    return Math.max(...past.map(r => getAdjustedRating(h, r)));
  };

  const getLast = (h) => {
    const past = h.past || [];
    return past.length > 0 ? (getAdjustedRating(h, past[0]) || 0) : 0;
  };

  const getAllAvg = (h) => {
    const past = h.past || [];
    if (past.length === 0) return 0;
    return past.reduce((acc, r) => acc + getAdjustedRating(h, r), 0) / past.length;
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
    [race.horses, sortBy, aiMode, wValue, dValue, gValue]
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
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
    </svg>
  );

  const ClaudeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a1 1 0 0 1 1 1v4.757l3.364-3.364a1 1 0 1 1 1.414 1.414L14.414 9H19a1 1 0 1 1 0 2h-4.757l3.364 3.364a1 1 0 0 1-1.414 1.414L13 12.414V17a1 1 0 1 1-2 0v-4.757l-3.364 3.364a1 1 0 0 1-1.414-1.414L9.586 11H5a1 1 0 1 1 0-2h4.757L6.393 5.636a1 1 0 0 1 1.414-1.414L11 7.586V3a1 1 0 0 1 1-1z" />
    </svg>
  );

  const ChatGptIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Center Core */}
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />

      {/* Symmetrical Swirl Loops */}
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(0 12 12)" />
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(120 12 12)" />
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(180 12 12)" />
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(240 12 12)" />
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(300 12 12)" />
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
      <ThreeSliders wValue={wValue} setW={setW} dValue={dValue} setD={setD} gValue={gValue} setG={setG} />
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
              title="Sort by"
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
              wValue={wValue}
              dValue={dValue}
              gValue={gValue}
              todayDistance={race.distance}
              todayGoing={race.going}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RaceCard;