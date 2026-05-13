import React from 'react';
import RaceCard from './Racecard';

const RaceGrid = ({ races, filters, enabledAlarms, toggleAlarm }) => {
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
            isAlarmEnabled={enabledAlarms.has(id)}
            onToggleAlarm={() => toggleAlarm(id)}
          />
        );
      })}
    </div>
  );
};

export default RaceGrid;
