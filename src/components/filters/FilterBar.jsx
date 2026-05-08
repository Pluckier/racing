import React from 'react';

const FilterBar = ({ filters, setFilters, uniquePlaces, onShowMovement, onShowFavorites }) => {
  return (
    <div className="filter-section">
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

      <div className="summary-controls">
        <button className={`filter-btn follow-btn ${filters.follow ? 'active' : ''}`} onClick={() => setFilters(f => ({ ...f, follow: !f.follow }))} title="Only show races that haven't run yet">⏱️ Follow</button>
        <button className="filter-btn movement-summary-btn" onClick={onShowMovement} title="Show odds movements">📊 Odds</button>
        <button className={`filter-btn interesting-selections-btn ${filters.value ? 'active' : ''}`} onClick={() => setFilters(f => ({ ...f, value: !f.value }))} title="Highlight well rated big prices">⭐ Value</button>
        <button className="filter-btn strong-favorites-btn" onClick={onShowFavorites} title="Show short priced favourites">📜 Short</button>
        <button className={`filter-btn fiddle-btn ${filters.fiddle ? 'active' : ''}`} onClick={() => setFilters(f => ({ ...f, fiddle: !f.fiddle }))} title="Highlight well connected horses">🎻 Fiddles</button>
        <button className={`filter-btn follow-btn ${filters.select ? 'active' : ''}`} onClick={() => setFilters(f => ({ ...f, select: !f.select }))} title="Highlight top rated favorites">🎯 Select</button>
      </div>
    </div>
  );
};

export default FilterBar;