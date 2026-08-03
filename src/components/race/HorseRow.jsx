import React, { useState } from 'react';
import PastRace from './PastRace';
import '../../css/HorseRow.css';
import { useStore } from '../../store/alarmStore';

const HorseRow = ({ horse, sortBy, highlightFiddle, highlightValue, highlightSelect }) => {
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

  const isAiEnabled = useStore((state) => state.isAiEnabled);

  let displayRating = null;
  if (sortBy === 'high') {
    // Show career highest rating
    displayRating = pastRuns.length > 0 ? Math.max(...pastRuns.map(r => Number(isAiEnabled ? r.nameAI : r.name) || 0)) : null;
  } else if (sortBy === 'last') {
    // Show rating from the most recent run only
    displayRating = pastRuns.length > 0 ? (Number(isAiEnabled ? pastRuns[0].nameAI : pastRuns[0].name) || 0) : null;
  } else if (sortBy === 'all') {
    // Calculate average rating across all career runs
    displayRating = pastRuns.length > 0
      ? (pastRuns.reduce((acc, race) => acc + (Number(isAiEnabled ? race.nameAI : race.name) || 0), 0) / pastRuns.length).toFixed(0)
      : null;
  } else {
    // Default: Calculate average rating of the last 3 runs (L3)
    const lastThree = pastRuns.slice(0, 3);
    displayRating = lastThree.length > 0
      ? (lastThree.reduce((acc, race) => acc + (Number(isAiEnabled ? race.nameAI : race.name) || 0), 0) / lastThree.length).toFixed(0)
      : null;
  }

  const lastRunRating = pastRuns.length > 0 ? (Number(isAiEnabled ? pastRuns[0].nameAI : pastRuns[0].name) || 0) : 0;
  const peakRating = pastRuns.length > 0 ? Math.max(...pastRuns.map(r => Number(isAiEnabled ? r.nameAI : r.name) || 0)) : 0;
  const isImprover = lastRunRating > 0 && lastRunRating === peakRating;

  return (
    <div className={`
      horse-row 
      ${isNR ? 'non-runner' : ''} 
    `}>
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
                  {highlightSelect && <span className="indicator select" title="Select Filter" />}
                  {highlightFiddle && <span className="indicator fiddle" title="Fiddle Filter" />}
                  {highlightValue && (
                    <span
                      className={`indicator value ${typeof highlightValue === 'string' ? highlightValue : ''}`}
                      title="Value Filter"
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
          <div className="jockey-row" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <strong>J:</strong> {horse.jockey}
          </div>
          <div className="trainer-row" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
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
            <PastRace key={idx} race={race} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HorseRow