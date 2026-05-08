import React from 'react';
import '../../css/PastRace.css';

const PastRace = ({ race }) => {
  // Destructuring the JSON properties for cleaner code
  const { 
    course, 
    date, 
    time, 
    name, 
    position, 
    weight, 
    distance, 
    going,
    raceClass,
    distBeaten, 
    url 
  } = race;

  // Helper function to convert furlongs string (e.g., "15f") to miles and furlongs (e.g., "1m 7f")
  const formatFurlongsToMiles = (furlongsStr) => {
    if (!furlongsStr || typeof furlongsStr !== 'string' || !furlongsStr.endsWith('f')) {
      return furlongsStr; // Return as is if not in expected format
    }

    const furlongs = parseInt(furlongsStr.slice(0, -1), 10); // Remove 'f' and parse
    if (isNaN(furlongs)) {
      return furlongsStr; // Return as is if parsing fails
    }

    const miles = Math.floor(furlongs / 8);
    const remainingFurlongs = furlongs % 8;

    let result = '';
    if (miles > 0) {
      result += `${miles}m`;
    }
    if (remainingFurlongs > 0) {
      if (result) {
        result += ' '; // Add space if both miles and furlongs are present
      }
      result += `${remainingFurlongs}f`;
    }

    return result || (furlongs === 0 ? '0f' : furlongsStr); // Handle 0 furlongs or original if no conversion happened
  };

  return (
    <div className="past-race-row">
      <span className="past-race-date">{date}</span>
      <span className="past-race-time">{time}</span>
      <span className="past-race-course">
        <strong>{course}</strong> <small className="past-race-meta">({raceClass && `C${raceClass}`}, {formatFurlongsToMiles(distance)}, {going})</small>
      </span>
      <span className="past-race-position-col">
        <small>Pos: </small><strong>{position}</strong> {distBeaten && <small>({distBeaten} btn)</small>}
      </span>
      <span className="past-race-weight-rtg-col">
        <small>Wt: </small><strong>{weight}</strong> • <small>Rtg: </small><strong>{name}</strong>
      </span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="past-race-link">↗</a>
    </div>
  );
};
export default PastRace;