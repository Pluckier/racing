import React from 'react';
import { useStore } from '../../store/store';
import { isNiceRace } from '../../utils/racingLogic';
import { getRaceAlarmId } from '../../hooks/useAlarms';

const FilterBar = ({ filters, setFilters, uniquePlaces, races = [], onShowMovement, onShowTrainers, onShowNotes }) => {
  const notedHorses = useStore((state) => state.notedHorses) || [];
  const alarms = useStore((state) => state.alarms) || [];
  const addAlarms = useStore((state) => state.addAlarms);
  const removeAlarms = useStore((state) => state.removeAlarms);

  const [isNiceMenuOpen, setIsNiceMenuOpen] = React.useState(false);
  const niceMenuRef = React.useRef(null);

  // Exact matching color palette from your timeline component
  const originalPalette = ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043'];

  // Compute all Nice races of the day
  const niceRaces = React.useMemo(() => {
    return (races || []).filter(isNiceRace);
  }, [races]);

  const niceRaceAlarmIds = React.useMemo(() => {
    return niceRaces.map(getRaceAlarmId).filter(Boolean);
  }, [niceRaces]);

  const activeNiceAlarmsCount = React.useMemo(() => {
    return niceRaceAlarmIds.filter(id => alarms.includes(id)).length;
  }, [niceRaceAlarmIds, alarms]);

  const allNiceAlarmsActive = niceRaceAlarmIds.length > 0 && activeNiceAlarmsCount === niceRaceAlarmIds.length;
  const someNiceAlarmsActive = activeNiceAlarmsCount > 0 && !allNiceAlarmsActive;

  // Close dropdown on outside click or escape key
  React.useEffect(() => {
    if (!isNiceMenuOpen) return;
    const handleClickOutside = (event) => {
      if (niceMenuRef.current && !niceMenuRef.current.contains(event.target)) {
        setIsNiceMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsNiceMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNiceMenuOpen]);

  const handleToggleAllNiceAlarms = (e) => {
    if (e) e.stopPropagation();
    if (niceRaceAlarmIds.length === 0) return;
    if (allNiceAlarmsActive) {
      removeAlarms(niceRaceAlarmIds);
    } else {
      addAlarms(niceRaceAlarmIds);
    }
  };

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

    // This array is ordered chronologically by first race time
    return Object.keys(meetingEarliestTimes).sort((a, b) => meetingEarliestTimes[a] - meetingEarliestTimes[b]);
  }, [races]);

  return (
    <div className="filter-section" style={{ marginTop: '20px' }}>
      <div className="place-filters">
        {/* LOOP CHRONOLOGICAL VENUES INSTEAD: Sorts buttons left-to-right identically to chart rows */}
        {chronologicalVenues.map((place, index) => {
          const isActive = filters.places.includes(place);

          // The index here now matches the true chronological row order perfectly
          const assignedColor = originalPalette[index % originalPalette.length];

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
              title={`${place} races`}
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
          className="filter-btn notes-btn"
          onClick={onShowNotes}
          title="Show noted horses"
        >
          📝 Notes {notedHorses.length > 0 && <span className="notes-badge">({notedHorses.length})</span>}
        </button>

        {/* Multi-Action Split Button for 🏆 Nice */}
        <div
          ref={niceMenuRef}
          className={`split-btn-container handicap-split-btn ${filters.tricast ? 'active-filter' : ''} ${allNiceAlarmsActive ? 'active-alarms' : ''}`}
        >
          {/* Option 1: Primary Action Button (Current Filtering) */}
          <button
            type="button"
            title="Tricasts & Class 1 & 2 (8+ runners) — Click to toggle filter"
            onClick={() => setFilters(f => ({ ...f, tricast: !f.tricast }))}
            className={`split-btn-main handicap-btn ${filters.tricast ? 'active' : ''}`}
          >
            Nice
          </button>

          {/* Option 2: Quick Split Secondary Action (Turn on all nice races alarms) */}
          <button
            type="button"
            title={
              niceRaceAlarmIds.length === 0
                ? "No Nice races found today"
                : allNiceAlarmsActive
                  ? `All ${niceRaceAlarmIds.length} Nice race alarms active (Click to turn off)`
                  : `Turn on all ${niceRaceAlarmIds.length} Nice race alarms (4m before post)`
            }
            onClick={handleToggleAllNiceAlarms}
            className={`split-btn-alarm ${allNiceAlarmsActive ? 'alarm-active' : someNiceAlarmsActive ? 'alarm-partial' : ''}`}
            disabled={niceRaceAlarmIds.length === 0}
          >
            <span className="split-bell-icon">🔔</span>
            {activeNiceAlarmsCount > 0 && (
              <span className="split-alarm-badge">{activeNiceAlarmsCount}</span>
            )}
          </button>

          {/* Dropdown Menu Trigger */}
          <button
            type="button"
            title="Nice races options"
            aria-label="Nice races menu"
            aria-haspopup="true"
            aria-expanded={isNiceMenuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setIsNiceMenuOpen(prev => !prev);
            }}
            className={`split-btn-caret ${isNiceMenuOpen ? 'open' : ''}`}
          >
            ▾
          </button>

          {/* Secondary Actions Dropdown Menu */}
          {isNiceMenuOpen && (
            <div className="split-btn-dropdown">
              <div className="split-dropdown-header">
                <span className="split-dropdown-title">🏆 Nice Races</span>
                <span className="split-dropdown-sub">
                  {niceRaceAlarmIds.length === 0
                    ? 'No Nice races today'
                    : `${activeNiceAlarmsCount} of ${niceRaceAlarmIds.length} alarms active`}
                </span>
              </div>

              <div className="split-dropdown-divider" />

              {/* Turn on all nice races alarms */}
              <button
                type="button"
                className="split-dropdown-item"
                disabled={niceRaceAlarmIds.length === 0 || allNiceAlarmsActive}
                onClick={() => {
                  addAlarms(niceRaceAlarmIds);
                  setIsNiceMenuOpen(false);
                }}
              >
                <span className="split-item-icon">🔔</span>
                <span className="split-item-text">
                  Turn on all Nice race alarms ({niceRaceAlarmIds.length})
                </span>
              </button>

              {/* Turn off nice race alarms */}
              <button
                type="button"
                className="split-dropdown-item"
                disabled={activeNiceAlarmsCount === 0}
                onClick={() => {
                  removeAlarms(niceRaceAlarmIds);
                  setIsNiceMenuOpen(false);
                }}
              >
                <span className="split-item-icon">🔕</span>
                <span className="split-item-text">Turn off Nice race alarms</span>
              </button>

              <div className="split-dropdown-divider" />

              {/* Toggle filter */}
              <button
                type="button"
                className="split-dropdown-item"
                onClick={() => {
                  setFilters(f => ({ ...f, tricast: !f.tricast }));
                  setIsNiceMenuOpen(false);
                }}
              >
                <span className="split-item-icon">{filters.tricast ? '✓' : '🏆'}</span>
                <span className="split-item-text">
                  {filters.tricast ? 'Filter: Active (click to disable)' : 'Filter Nice races'}
                </span>
              </button>
            </div>
          )}
        </div>
        <button className="filter-btn strong-favorites-btn" onClick={onShowTrainers} title="Set hot connections">🔥 Hot</button>
        <button className="filter-btn movement-summary-btn" onClick={onShowMovement} title="Show odds movements">📊 Odds</button>
      </div>
    </div>
  );
};

export default FilterBar;
