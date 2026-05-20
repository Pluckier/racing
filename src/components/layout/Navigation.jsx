import React, { useRef } from 'react';

const Navigation = ({ displayDate, setDisplayDate, formattedDateTime }) => {
  const dateInputRef = useRef(null);

  const handleOpenDatePicker = () => {
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
      <label htmlFor="main-date-picker">
        <h2 onClick={handleOpenDatePicker} className="date-header" title="Click to change date">
          The Racing {formattedDateTime.split(' (')[0]}
          <span className="date-icon">📅</span>
        </h2>
      </label>
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