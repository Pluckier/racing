import React, { useState, useEffect } from 'react';
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

const Navigation = ({ displayDate, setDisplayDate, detailsContent }) => {
  const [isOpen, setIsOpen] = useState(false);

  // 1. Manage the ticking time locally inside this component
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // Ticks every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Helper to get ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  // 1. Get the numeric day and the 'Month Year' parts natively
  const dayNum = displayDate.getDate();
  const monthYearStr = displayDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });

  // 2. Combine them cleanly into "9th September 2026"
  const formattedDateString = `${dayNum}${getOrdinalSuffix(dayNum)} ${monthYearStr}`;


  const summaryTime = currentTime.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

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
              The Racing for {formattedDateString}
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
