import React, { useRef } from 'react';

const Navigation = ({ displayDate, setDisplayDate, formattedDateTime }) => {
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
      <h2 className="date-header">
        The Racing {formattedDateTime.split(' (')[0]}
        <span 
          className="date-icon" 
          onClick={handleOpenDatePicker} 
          title="Click to change date"
          style={{ cursor: 'pointer' }}
        >
          📅
        </span>
      </h2>
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