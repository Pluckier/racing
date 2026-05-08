import React from 'react';
import RaceCard from './Racecard';

const RaceGrid = ({ races, filters }) => {
  return (
    <div className="race-grid">
      {races.map((race) => (
        <RaceCard 
          key={`${race.time}-${race.place}`} 
          race={race} 
          allRaces={races} 
          highlightFiddles={filters.fiddle}
          highlightValues={filters.value}
          highlightSelects={filters.select}
        />
      ))}
    </div>
  );
};

export default RaceGrid;
