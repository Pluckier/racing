import React, { useState } from 'react';
import PastRace from './PastRace';
import '../../css/HorseRow.css';
import { useStore } from '../../store/alarmStore';
import { SOFT_COLORS } from '../../constants/chartConstants';
import { HOT_TRAINERS, HOT_JOCKEYS } from '../../utils/racingLogic';

const HorseRow = ({ horse, sortBy, highlightFiddle, highlightValue, highlightSelect, wValue = 0, dValue = 0, gValue = 0, todayDistance = '', todayGoing = '' }) => {
  const [showForm, setShowForm] = useState(false);

  const pastRuns = horse.past || [];

  const oddsArr = horse.odds || [];
  const currentOdds = oddsArr[oddsArr.length - 1];
  const previousOdds = oddsArr[oddsArr.length - 2];
  const isNR = currentOdds === "null" || currentOdds === "NR";

  let oddsArrow = null;
  if (!isNR && currentOdds && previousOdds && previousOdds !== "null" && previousOdds !== "NR") {
    const cur = parseFloat(currentOdds);
    const prev = parseFloat(previousOdds);
    if (!isNaN(cur) && !isNaN(prev)) {
      if (cur < prev) {
        oddsArrow = <span className="odds-arrow arrow-up" title={`Shortened from ${prev}`}>▲</span>;
      } else if (cur > prev) {
        oddsArrow = <span className="odds-arrow arrow-down" title={`Lengthened from ${prev}`}>▼</span>;
      } else {
        oddsArrow = <span className="odds-arrow arrow-stable">~</span>;
      }
    }
  }

  // 1. Fetch the 3-way numerical mode state
  const aiMode = useStore((state) => state.aiMode);

  const selectedTrainers = useStore((state) => state.selectedTrainers);
  const setSelectedTrainers = useStore((state) => state.setSelectedTrainers);
  const selectedJockeys = useStore((state) => state.selectedJockeys);
  const setSelectedJockeys = useStore((state) => state.setSelectedJockeys);

  const handleFiddleClick = (e) => {
    e.stopPropagation(); // Prevent row toggling/collapse

    const horseTrainer = horse.trainer ? horse.trainer.trim() : '';
    const horseJockey = horse.jockey ? horse.jockey.trim() : '';

    // Remove trainer from store selections
    let currentTrainers = selectedTrainers;
    if (currentTrainers === null) {
      currentTrainers = HOT_TRAINERS;
    }
    const nextTrainers = currentTrainers.filter(t => !horseTrainer.includes(t) && !t.includes(horseTrainer));
    setSelectedTrainers(nextTrainers);

    // Remove jockey from store selections
    let currentJockeys = selectedJockeys;
    if (currentJockeys === null) {
      currentJockeys = HOT_JOCKEYS;
    }
    const nextJockeys = currentJockeys.filter(j => !horseJockey.includes(j) && !j.includes(horseJockey));
    setSelectedJockeys(nextJockeys);
  };

  const handleTrainerClick = (e) => {
    e.stopPropagation();
    const trainerName = horse.trainer ? horse.trainer.trim() : '';
    if (!trainerName) return;

    let currentTrainers = selectedTrainers;
    if (currentTrainers === null) {
      currentTrainers = HOT_TRAINERS;
    }

    if (currentTrainers.some(t => trainerName.includes(t) || t.includes(trainerName))) {
      setSelectedTrainers(currentTrainers.filter(t => !trainerName.includes(t) && !t.includes(trainerName)));
    } else {
      setSelectedTrainers([...currentTrainers, trainerName]);
    }
  };

  const handleJockeyClick = (e) => {
    e.stopPropagation();
    const jockeyName = horse.jockey ? horse.jockey.trim() : '';
    if (!jockeyName) return;

    let currentJockeys = selectedJockeys;
    if (currentJockeys === null) {
      currentJockeys = HOT_JOCKEYS;
    }

    if (currentJockeys.some(j => jockeyName.includes(j) || j.includes(jockeyName))) {
      setSelectedJockeys(currentJockeys.filter(j => !jockeyName.includes(j) && !j.includes(jockeyName)));
    } else {
      setSelectedJockeys([...currentJockeys, jockeyName]);
    }
  };

  const trainerTrimmed = horse.trainer ? horse.trainer.trim() : '';
  const jockeyTrimmed = horse.jockey ? horse.jockey.trim() : '';

  const isTrainerHighlighted = selectedTrainers !== null 
    ? selectedTrainers.some(t => trainerTrimmed.includes(t) || t.includes(trainerTrimmed))
    : HOT_TRAINERS.some(t => trainerTrimmed.includes(t));

  const isJockeyHighlighted = selectedJockeys !== null 
    ? selectedJockeys.some(j => jockeyTrimmed.includes(j) || j.includes(jockeyTrimmed))
    : HOT_JOCKEYS.some(j => jockeyTrimmed.includes(j));

  // 2. Clear helper to safely parse individual run metrics based on state
  const getRating = (run) => {
    if (!run) return 0;
    const targetProperty = aiMode === 2 ? run.name2AI : aiMode === 1 ? run.nameAI : run.name;
    return Number(targetProperty) || 0;
  };

  // --- W/D/G Slider Bonus Helpers ---
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

  // Applies the same W/D/G bonus formula used in FormChart
  const getAdjustedRating = (run) => {
    const baseRating = getRating(run);
    if (!baseRating) return 0;
    let totalBonus = 0;

    // W — Weight turnaround
    const todayWeightLbs = parseWeightToLbs(horse?.weight);
    const pastWeightLbs = parseWeightToLbs(run?.weight);
    if (pastWeightLbs > 0 && todayWeightLbs > 0) {
      const weightDifference = Math.abs(pastWeightLbs - todayWeightLbs);
      const weightFactor = Math.pow(wValue / 100, 4);
      if (todayWeightLbs < pastWeightLbs) {
        totalBonus += baseRating * (weightFactor * 0.30) * weightDifference;
      } else if (todayWeightLbs > pastWeightLbs) {
        totalBonus -= baseRating * (weightFactor * 0.01) * weightDifference;
      }
    }

    // D — Distance match (within 20% tolerance)
    const todayFurlongs = parseDistanceToFurlongs(todayDistance);
    const raceFurlongs = parseDistanceToFurlongs(run?.distance);
    if (todayFurlongs > 0 && raceFurlongs > 0) {
      const maxAllowedDiff = todayFurlongs * 0.20;
      if (Math.abs(todayFurlongs - raceFurlongs) <= maxAllowedDiff) {
        totalBonus += baseRating * dValue;
      }
    }

    // G — Going match
    const cleanPastGoing = (run?.going || '').trim().toLowerCase();
    const cleanTodayGoing = (todayGoing || '').trim().toLowerCase();
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

  let displayRating = null;
  if (sortBy === 'high') {
    // Show career highest adjusted rating
    displayRating = pastRuns.length > 0 ? Math.max(...pastRuns.map(r => getAdjustedRating(r))).toFixed(0) : null;
  } else if (sortBy === 'last') {
    // Show rating from the most recent run only
    displayRating = pastRuns.length > 0 ? getAdjustedRating(pastRuns[0]).toFixed(0) : null;
  } else if (sortBy === 'all') {
    // Calculate average adjusted rating across all career runs
    displayRating = pastRuns.length > 0
      ? (pastRuns.reduce((acc, run) => acc + getAdjustedRating(run), 0) / pastRuns.length).toFixed(0)
      : null;
  } else {
    // Default: Calculate average adjusted rating of the last 3 runs (L3)
    const lastThree = pastRuns.slice(0, 3);
    displayRating = lastThree.length > 0
      ? (lastThree.reduce((acc, run) => acc + getAdjustedRating(run), 0) / lastThree.length).toFixed(0)
      : null;
  }

  const lastRunRating = pastRuns.length > 0 ? getAdjustedRating(pastRuns[0]) : 0;
  const peakRating = pastRuns.length > 0 ? Math.max(...pastRuns.map(r => getAdjustedRating(r))) : 0;
  const isImprover = lastRunRating > 0 && lastRunRating === peakRating;

  const num = parseInt(horse.number, 10);
  const colorIndex = !isNaN(num) ? (num - 1) % SOFT_COLORS.length : SOFT_COLORS.length - 1;
  const rowBg = `${SOFT_COLORS[colorIndex]}40`; // 25% opacity

  return (
    <div
      className={`horse-row ${isNR ? 'non-runner' : ''}`}
      style={{ backgroundColor: rowBg }}
    >
      <div className="horse-main">
        <div className="horse-info-container">
          <div className="horse-silks-wrapper">
            {horse.silks && <img src={horse.silks} alt="silks" className="horse-silks" />}
          </div>
          <div className="horse-primary-data">
            <span className="cell-no">{horse.number}.</span>
            <span className="cell-draw hide-mobile hide-mobile-medium">{horse.draw ? `(${horse.draw})` : ''}</span>
            <span className="cell-form hide-mobile hide-mobile-medium">{horse.form}</span>
            <span className="cell-name">
              <span className="name-wrapper">
                <strong>{horse.name}</strong>{isImprover ? '*' : ''}
                <span className="highlight-indicators-inline">
                  {highlightSelect && <span className="indicator select" title="Recent Form" />}
                  {highlightFiddle && (
                    <span
                      className="indicator fiddle"
                      title="Hot Trainer or Jockey - removes hot"
                      onClick={handleFiddleClick}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  {highlightValue && (
                    <span
                      className={`indicator value ${typeof highlightValue === 'string' ? highlightValue : ''}`}
                      title="Performance"
                    />
                  )}
                </span>
              </span>
            </span>
            <span className="cell-lastrun hide-mobile hide-mobile-medium">{horse.lastRun && `${horse.lastRun}`}</span>
            <span className="cell-age hide-mobile hide-mobile-medium">{horse.age}yo</span>
            <span className="cell-weight hide-mobile hide-mobile-medium">{horse.weight}</span>
          </div>
        </div>
        <div className="horse-personnel-column hide-mobile hide-mobile-medium">
          <div
            className="jockey-row"
            onClick={handleJockeyClick}
            title={isJockeyHighlighted ? "Click to remove jockey from highlights" : "Click to highlight jockey"}
            style={{
              textAlign: 'right',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              fontWeight: isJockeyHighlighted ? 'bold' : 'normal'
            }}
          >
            <strong>J:</strong> {horse.jockey}
          </div>
          <div
            className="trainer-row"
            onClick={handleTrainerClick}
            title={isTrainerHighlighted ? "Click to remove trainer from highlights" : "Click to highlight trainer"}
            style={{
              textAlign: 'right',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              fontWeight: isTrainerHighlighted ? 'bold' : 'normal'
            }}
          >
            <strong>T:</strong> {horse.trainer}
            {horse.breeding && <span className="cell-breeding"> • <strong>B:</strong> {horse.breeding}</span>}
          </div>
        </div>
        <span className="avg-rating"> {displayRating !== null ? displayRating : '-'}</span>
        <span className="odds-value">
          {isNR ? "NR" : (currentOdds || "x")}
          {oddsArrow}
        </span>
        <button className="past-button hide-mobile hide-mobile-medium" onClick={() => setShowForm(!showForm)}>{pastRuns.length}</button>
      </div>

      {showForm && (
        <div className="past-races-container">
          {horse.past.map((race, idx) => (
            <PastRace key={idx} race={race} adjustedRating={getAdjustedRating(race)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HorseRow;
