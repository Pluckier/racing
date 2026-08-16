import React, { useState, useMemo } from 'react';

const SearchOverlay = ({ races, viewMode, currentDateStr }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term || !Array.isArray(races)) return [];
    
    const matches = [];
    races.forEach(race => {
      race.horses?.forEach(horse => {
        if (horse.name?.toLowerCase().includes(term) || horse.trainer?.toLowerCase().includes(term)  || horse.jockey?.toLowerCase().includes(term)) {
          matches.push({
            name: horse.name,
            id: `${race.time}${race.place.replace(/\s+/g, '')}`,
            info: `${horse.trainer} - ${horse.jockey} - ${race.time} ${race.place}`
          });
        }
      });
    });
    return matches.slice(0, 10);
  }, [searchTerm, races]);

  const handleSearchSelect = (id) => {
    if (viewMode === 'single') {
      window.location.hash = `${currentDateStr}@${id}`;
      setSearchTerm('');
      return;
    }

    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
      setSearchTerm('');
    }
  };

  return (
    <div className="search-container">
      <input
        type="text"
        placeholder="🔍 Search..."
        className="filter-btn search-input"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((res, i) => (
            <div key={`${res.id}-${i}`} onClick={() => handleSearchSelect(res.id)} className="search-result-item">
              <span className="search-result-name">{res.name}</span>
              <span className="search-result-info">{res.info}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchOverlay;