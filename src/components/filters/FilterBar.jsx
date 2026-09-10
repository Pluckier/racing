import React from 'react';

const FilterBar = ({ filters, setFilters, uniquePlaces, races = [], onShowMovement, onShowTrainers }) => {
  // Exact matching color palette from your timeline component
  const originalPalette = ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043'];

  // Compute chronological venue row ordering dynamically based on earliest race times
  const chronologicalVenues = React.useMemo(() => {
    const meetingEarliestTimes = {};

    races.forEach((race) => {
      if (!race?.place || !race?.time) return;

      const timeStr = String(race.time).trim();
      const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return;

      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const totalMinutes = hours * 60 + minutes;
      const venueName = String(race.place).trim();

      if (!(venueName in meetingEarliestTimes) || totalMinutes < meetingEarliestTimes[venueName]) {
        meetingEarliestTimes[venueName] = totalMinutes;
      }
    });

    return Object.keys(meetingEarliestTimes).sort((a, b) => meetingEarliestTimes[a] - meetingEarliestTimes[b]);
  }, [races]);

  return (
    <div className="filter-section" style={{ marginTop: '20px' }}>
      <div className="place-filters">
        {uniquePlaces.map((place) => {
          const isActive = filters.places.includes(place);
          const cleanPlace = String(place).trim();
          const venueRowIndex = chronologicalVenues.indexOf(cleanPlace);

          // Match the timeline row color index precisely
          const assignedColor = venueRowIndex !== -1
            ? originalPalette[venueRowIndex % originalPalette.length]
            : '#4285F4';

          // Flipped Look and Feel: Solid fill when inactive, transparent outline when active
          const buttonStyle = isActive
            ? {
              border: `1.5px solid ${assignedColor}`,
              backgroundColor: 'transparent',
              color: assignedColor,
            }
            : {
              backgroundColor: assignedColor,
              borderColor: assignedColor,
              color: '#ffffff',
            };

          return (
            <button
              key={place}
              onClick={() => setFilters(f => ({
                ...f,
                places: isActive ? f.places.filter(p => p !== place) : [...f.places, place]
              }))}
              style={buttonStyle}
              className={`filter-btn ${isActive ? 'active' : ''}`}
            >
              {place}
            </button>
          );
        })}
        <button
          onClick={() => setFilters(f => ({ ...f, tricast: !f.tricast }))}
          className={`filter-btn handicap-btn ${filters.tricast ? 'active' : ''}`}
        >
          🏆 Tricasts
        </button>
        <button className="filter-btn strong-favorites-btn" onClick={onShowTrainers} title="Set hot connections">🔥 Connections</button>
        <button className="filter-btn movement-summary-btn" onClick={onShowMovement} title="Show odds movements">📊 Odds</button>
      </div>
    </div>
  );
};

export default FilterBar;
