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

      <div className="summary-controls" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
        <button className={`filter-btn follow-btn ${filters.follow ? 'active' : ''}`} onClick={() => setFilters(f => ({ ...f, follow: !f.follow }))} title="Only show races that haven't run yet">⏱️ Follow</button>
        <button className="filter-btn movement-summary-btn" onClick={onShowMovement} title="Show odds movements">📊 Odds</button>
        <button className="filter-btn strong-favorites-btn" onClick={onShowTrainers} title="Show Hot Trainers & Jockeys">🔥 Hot T/J</button>
        <button className={`filter-btn interesting-selections-btn ${filters.value ? 'active' : ''}`} onClick={() => setFilters(f => ({ ...f, value: !f.value }))} title="Highlight well rated big prices">⭐ Value</button>
        <button className={`filter-btn fiddle-btn ${filters.fiddle ? 'active' : ''}`} onClick={() => setFilters(f => ({ ...f, fiddle: !f.fiddle }))} title="Highlight well connected horses">🔥 Hot</button>
        <button className={`filter-btn follow-btn ${filters.select ? 'active' : ''}`} onClick={() => setFilters(f => ({ ...f, select: !f.select }))} title="Highlight top rated 1 run">🎯 Recent</button>
      </div>
    </div>
  );
};

export default FilterBar;