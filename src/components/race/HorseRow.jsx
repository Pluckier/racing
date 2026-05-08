import React, { useState } from 'react';
import PastRace from './PastRace';
import '../../css/HorseRow.css';

const HorseRow = ({ horse, sortBy, highlightFiddle, highlightValue, highlightSelect }) => {
  const [showForm, setShowForm] = useState(false);

  const pastRuns = horse.past || [];

  const isNR = horse.odds?.[horse.odds.length - 1] === "null" || horse.odds?.[horse.odds.length - 1] === "NR";

  let displayRating = null;
  if (sortBy === 'high') {
    // Show career highest rating
    displayRating = pastRuns.length > 0 ? Math.max(...pastRuns.map(r => Number(r.name) || 0)) : null;
  } else if (sortBy === 'last') {
    // Show rating from the most recent run only
    displayRating = pastRuns.length > 0 ? (Number(pastRuns[0].name) || 0) : null;
  } else if (sortBy === 'all') {
    // Calculate average rating across all career runs
    displayRating = pastRuns.length > 0
      ? (pastRuns.reduce((acc, race) => acc + (Number(race.name) || 0), 0) / pastRuns.length).toFixed(0)
      : null;
  } else {
    // Default: Calculate average rating of the last 3 runs (L3)
    const lastThree = pastRuns.slice(0, 3);
    displayRating = lastThree.length > 0
      ? (lastThree.reduce((acc, race) => acc + (Number(race.name) || 0), 0) / lastThree.length).toFixed(0)
      : null;
  }

  return (
    <div className={`
      horse-row 
      ${isNR ? 'non-runner' : ''} 
      ${highlightFiddle ? 'fiddle-highlight' : ''} 
      ${highlightValue ? 'value-highlight' : ''}
      ${highlightSelect ? 'select-highlight' : ''}
    `}>
      <div className="horse-main">
        <div className="horse-info-container">
          <div className="horse-silks-wrapper">
            {horse.silks && <img src={horse.silks} alt="silks" className="horse-silks" />}
          </div>
          <div className="horse-details-column">
            <span className="horse-name-row">
              <span className="cell-no">{horse.number}.</span>
              <span className="cell-draw hide-mobile">{horse.draw ? `(${horse.draw})` : ''}</span>
              <span className="cell-form hide-mobile">{horse.form}</span>
              <span className="cell-name"><strong>{horse.name}</strong></span>
              <span className="cell-lastrun hide-mobile">{horse.lastRun && `${horse.lastRun}`}</span>
              <span className="cell-age hide-mobile">{horse.age}yo</span>
              <span className="cell-weight hide-mobile">{horse.weight}</span>
              <span className="cell-jockey hide-mobile">
                <strong>J:</strong> {horse.jockey}
              </span>          
            </span>
            <span className="trainer-row hide-mobile">
              <span className="cell-owner">
                <strong>O:</strong> {horse.owner}
              </span>
              <span className="cell-breeding">
                {horse.breeding && <><strong>B:</strong> {horse.breeding}</>}
              </span> 
              <span className="cell-trainer">
                <strong>T:</strong> {horse.trainer}
              </span>
            </span>
          </div>
        </div>
      <span className="avg-rating"> {displayRating !== null ? displayRating : '-'}</span>
      <span className="odds-value">
        {horse.odds?.[horse.odds.length - 1] === "null" 
          ? "NR" 
          : (horse.odds?.[horse.odds.length - 1] ? (isNaN(horse.odds[horse.odds.length - 1]) ? horse.odds[horse.odds.length - 1] : Number(horse.odds[horse.odds.length - 1])) : "x")}
      </span>
      <button className="past-button hide-mobile" onClick={() => setShowForm(!showForm)}>{pastRuns.length}</button>
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