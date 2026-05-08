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

const RaceCard = ({ race, allRaces = [], highlightFiddles, highlightValues, highlightSelects }) => {
  const [showChart, setShowChart] = useState(false);
  const [showOdds, setShowOdds] = useState(false);
  const [sortBy, setSortBy] = useState('avg');
  const [activeChartRace, setActiveChartRace] = useState(race);

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Logic to play music 2 minutes before the race time
  useEffect(() => {
    if (!audioEnabled || hasPlayed || !race.time || !race.time.includes(':')) return;

    const checkTime = () => {
      const now = new Date();
      const [hours, minutes] = race.time.split(':').map(Number);
      const raceTime = new Date();
      raceTime.setHours(hours, minutes, 0, 0);

      const triggerTime = raceTime.getTime() - 120000; // 120,000ms = 2 minutes

      if (now.getTime() >= triggerTime && now.getTime() < raceTime.getTime()) {
        const audio = new Audio('music.mp3'); // References public/music.mp3
        audio.play().catch(err => console.error("Audio playback blocked or failed:", err));
        setHasPlayed(true);
      }
    };

    const timer = setInterval(checkTime, 10000); // Check every 10 seconds
    return () => clearInterval(timer);
  }, [audioEnabled, hasPlayed, race.time]);

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

  const selectHorseNumber = useMemo(() => {
    const runners = race.horses.filter(h => getLatestOdds(h) !== Infinity);
    if (runners.length === 0) return null;

    // Identify Top 4 horses by Average Rating (Last 3 runs)
    const top4AvgNumbers = [...runners]
      .sort((a, b) => getAvg(b) - getAvg(a))
      .slice(0, 4)
      .map(h => h.number);

    // Identify Top 4 horses by Odds (Shortest prices)
    const top4OddsNumbers = [...runners]
      .sort((a, b) => getLatestOdds(a) - getLatestOdds(b))
      .slice(0, 4)
      .map(h => h.number);

    // Find horses that appear in both "Top 4" lists
    const candidates = runners.filter(h => top4AvgNumbers.includes(h.number) && top4OddsNumbers.includes(h.number));
    if (candidates.length === 0) return null;

    // If multiple candidates, the "Decider" is the one with the highest average rating
    return candidates.sort((a, b) => getAvg(b) - getAvg(a))[0].number;
  }, [race.horses]);

  const raceId = `${race.time}${race.place.replace(/\s+/g, '')}`;

  // Navigation logic for the FormChart Modal
  const currentIndex = allRaces.findIndex(r => r.time === activeChartRace.time && r.place === activeChartRace.place);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allRaces.length - 1 && currentIndex !== -1;

  const handlePrev = () => {
    if (hasPrev) setActiveChartRace(allRaces[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) setActiveChartRace(allRaces[currentIndex + 1]);
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
            <a href={`#${raceId}`} className="race-title-link">
              {race.time} {race.place}
            </a>
           <button 
              onClick={() => setAudioEnabled(!audioEnabled)}
              title={audioEnabled ? "Alarm active (2 mins before start)" : "Click to set alarm for this race"}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                marginRight: '10px',
                padding: 0,
                verticalAlign: 'middle',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                filter: audioEnabled ? 'drop-shadow(0 0 5px #ffcc00) brightness(1.1)' : 'grayscale(1) opacity(0.3)',
                transform: audioEnabled ? 'scale(1.15)' : 'scale(1)'
              }}
            >
              🔔
            </button>
          </h2>
          <h5 className="race-detail hide-on-mobile">{race.detail} {race.going}</h5>
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
          <button onClick={() => setShowOdds(!showOdds)} className="race-analytics-btn">
            Odds
          </button>
          <button onClick={openChart} className="race-analytics-btn">
            Past
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
        title={`${activeChartRace.time} ${activeChartRace.place} - ${activeChartRace.detail} ${activeChartRace.going}`}
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
          />
      </Modal>

      <div className="entries">
        {sortedHorses.map(horse => (
          <HorseRow 
            key={horse.number} 
            horse={horse} 
            sortBy={sortBy} 
            highlightFiddle={highlightFiddles && horse.isFiddle}
            highlightValue={highlightValues && horse.isValue}
            highlightSelect={highlightSelects && horse.number === selectHorseNumber}
          />
        ))}
      </div>
    </div>
  );
};

export default RaceCard;