import React from 'react';
import RaceCard from './Racecard';

const RaceGrid = ({ races, filters, enabledAlarms, toggleAlarm, viewMode, currentDateStr, approvedNonRunners, rejectedNonRunners }) => {
  return (
    <div className="race-grid">
      {races.map((race) => {
        const id = `${race.time}${race.place.replace(/\s+/g, '')}`;
        return (
          <RaceCard
            key={`${race.time}-${race.place}`}
            race={race}
            allRaces={races}
            highlightFiddles={filters.fiddle}
            highlightValues={filters.value}
            highlightSelects={filters.select}
            isAlarmEnabled={enabledAlarms.includes(id)}
            onToggleAlarm={() => toggleAlarm(id)}
            viewMode={viewMode}
            currentDateStr={currentDateStr}
            approvedNonRunners={approvedNonRunners}
            rejectedNonRunners={rejectedNonRunners}
          />
        );
      })}
    </div>
  );
};

export default RaceGrid;
