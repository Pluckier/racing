import React, { useRef } from 'react';

const Navigation = ({ displayDate, setDisplayDate, formattedDateTime, summaryTime, detailsContent }) => {
  const dateInputRef = useRef(null);

  const handleOpenDatePicker = () => {
    // Clear the URL state (hash and search parameters) when opening the date picker.
    // This ensures that manually selecting a new date isn't overridden by a stale URL date.
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.click();
      }
    }
  };

  const dateInputValue = `${displayDate.getFullYear()}-${String(displayDate.getMonth() + 1).padStart(2, '0')}-${String(displayDate.getDate()).padStart(2, '0')}`;

  return (
    <div className="navigation-section">
      <details className="timeline-details">
        <summary className="timeline-summary" style={{ listStyle: 'none' }}>
          <h2 className="date-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: 0 }}>
            <span onClick={(e) => e.preventDefault()} style={{ cursor: 'default' }}>
              The Racing {formattedDateTime.split(' (')[0]}
            </span>
            <span 
              className="date-icon" 
              onClick={(e) => { e.preventDefault(); handleOpenDatePicker(); }} 
              title="Click to change date"
              style={{ cursor: 'pointer' }}
            >
              📅
            </span>
            <span className="summary-time-inline" style={{ fontSize: '0.9em', opacity: 0.8, cursor: 'pointer' }}>
              ⏱️ {summaryTime}
            </span>
          </h2>
        </summary>
        <div className="details-expanded-content" style={{ marginTop: '15px' }}>
          {detailsContent}
        </div>
      </details>
      <input
        type="date"
        id="main-date-picker"
        ref={dateInputRef}
        value={dateInputValue}
        onChange={(e) => {
          if (e.target.value) {
            const [y, m, d] = e.target.value.split('-').map(Number);
            setDisplayDate(new Date(y, m - 1, d));
          }
        }}
        className="hidden-date-input"
      />
    </div>
  );
};

export default Navigation;