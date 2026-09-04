import React from 'react';

const FilterBar = ({ filters, setFilters, uniquePlaces, onShowMovement, onShowTrainers }) => {
  return (
    <div className="filter-section" style={{ marginTop: '2px' }}>
      <div className="place-filters">
        <button
          onClick={() => setFilters(f => ({ ...f, tricast: !f.tricast }))}
          className={`filter-btn handicap-btn ${filters.tricast ? 'active' : ''}`}
        >
          Tricasts
        </button>
        <button className="filter-btn movement-summary-btn" onClick={onShowMovement} title="Show odds movements">📊 Odds</button>
        <button className="filter-btn strong-favorites-btn" onClick={onShowTrainers} title="Set hot connections">🔥 Connections</button>

        {uniquePlaces.map(place => {
          const isActive = filters.places.includes(place);
          return (
            <button
              key={place}
              onClick={() => setFilters(f => ({
                ...f,
                places: isActive ? f.places.filter(p => p !== place) : [...f.places, place]
              }))}
              className={`filter-btn ${isActive ? 'active' : ''}`}
            >
              {place}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterBar;