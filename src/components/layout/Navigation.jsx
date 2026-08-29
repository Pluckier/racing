import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CustomDateInput = React.forwardRef(({ value, onClick }, ref) => (
  <span
    className="date-icon"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }}
    ref={ref}
    title="Click to change date"
    style={{ cursor: 'pointer' }}
  >
    📅
  </span>
));

CustomDateInput.displayName = 'CustomDateInput';

const Navigation = ({ displayDate, setDisplayDate, formattedDateTime, summaryTime, detailsContent }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="navigation-section">
      <details className="timeline-details" onToggle={(e) => setIsOpen(e.target.open)}>
        <summary className="timeline-summary" style={{ listStyle: 'none' }}>
          <h2 className="date-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: 0 }}>
            <DatePicker
              selected={displayDate}
              onChange={(date) => {
                if (date) {
                  if (window.location.hash || window.location.search) {
                    window.history.replaceState(null, '', window.location.pathname);
                  }
                  setDisplayDate(date);
                }
              }}
              dateFormat="dd/MM/yyyy"
              customInput={<CustomDateInput />}
              withPortal
              portalId="root"
            />
            <span onClick={(e) => e.preventDefault()} style={{ cursor: 'default' }}>
              The Racing {formattedDateTime.split(' (')[0]}
            </span>
            <span className="summary-time-inline" title={isOpen ? "Close info" : "Info / Settings"} style={{ fontSize: '0.9em', opacity: 0.8, cursor: 'pointer' }}>
              {isOpen ? '▲' : '☰'} {summaryTime}
            </span>
          </h2>
        </summary>
        <div className="details-expanded-content" style={{ marginTop: '15px' }}>
          {detailsContent}
        </div>
      </details>
    </div>
  );
};

export default Navigation;