import React, { useState, useMemo, useEffect } from 'react';
import HorseRow from './HorseRow';
import FormChart from '../charts/FormChart';
import OddsChart from '../charts/OddsChart';
import Modal from '../common/Modal';
import '../../css/RaceCard.css';

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

  const getAvg = (h) => {
    const past = h.past || [];
    const last3 = past.slice(0, 3);
    if (last3.length === 0) return 0;
    return last3.reduce((acc, r) => acc + (Number(r.name) || 0), 0) / last3.length;
  };

  const getMax = (h) => {
    const past = h.past || [];
    if (past.length === 0) return 0;
    return Math.max(...past.map(r => Number(r.name) || 0));
  };

  const getLast = (h) => {
    const past = h.past || [];
    return past.length > 0 ? (Number(past[0].name) || 0) : 0;
  };

  const getAllAvg = (h) => {
    const past = h.past || [];
    if (past.length === 0) return 0;
    return past.reduce((acc, r) => acc + (Number(r.name) || 0), 0) / past.length;
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
    [race.horses, sortBy]
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
  }, [race.horses, highlightValues]);

  const massiveSpikeHorseNumber = useMemo(() => {
    const activeRunners = race.horses.filter(h => getLatestOdds(h) !== Infinity);
    if (activeRunners.length < 2) return null;
    const sortedByPeak = [...activeRunners].sort((a, b) => getMax(b) - getMax(a));
    const topPeak = getMax(sortedByPeak[0]);
    const nextPeak = getMax(sortedByPeak[1]);
    const winner = sortedByPeak[0];

    // Find the race where the peak rating occurred to ensure it was a competitive effort
    const peakRun = (winner.past || []).find(p => (Number(p.name) || 0) === topPeak);
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
  }, [race.horses]);

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
  }, [race.horses]);


  const getRaceIcon = (r) => {
    if (!r) return '';
    const d = (r.detail || '').toLowerCase();
    const isH = d.includes('handicap') || d.includes('nursery');
    const isC1 = d.includes('class 1');
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
              title={isAlarmEnabled ? "Alarm active (2 mins before start)" : "Click to set alarm for this race"}
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
          <h5 className="race-detail">{getRaceIcon(race)} {race.detail} {race.going} (Runners {race.runners})</h5>
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