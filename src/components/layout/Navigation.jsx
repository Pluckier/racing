import React, { useRef } from 'react';
import TrackWorker from '../obs/TrackWorker';

const Navigation = ({ children, theme, setTheme, onRefresh, refreshCooldown, displayDate, setDisplayDate, formattedDateTime, onShowChat, isChatOpen }) => {
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
      <div className="top-bar">
        {children}
        <div className="top-bar-controls">
          <TrackWorker />

          <button 
            className={`filter-btn chat-btn ${isChatOpen ? 'active' : ''}`} 
            onClick={onShowChat} 
            title={isChatOpen ? "Close Chat" : "Open Chat"}
          >
            💬
          </button>

          <button 
            className={`filter-btn refresh-btn ${refreshCooldown ? 'disabled' : ''}`}
            onClick={onRefresh}
            disabled={refreshCooldown}
            title={refreshCooldown ? "Cooldown active" : "Refresh data"}
          >
            ↻
          </button>

          <div className="donate-container"> 
            <form action="https://www.paypal.com/donate" method="post" target="_blank"><input type="hidden" name="hosted_button_id" value="P9PLRQL24TBAN" /><input type="image" src="https://www.paypalobjects.com/en_GB/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" /><img alt="" border="0" src="https://www.paypal.com/en_GB/i/scr/pixel.gif" width="1" height="1" /></form>
          </div>
          <div className="theme-toggle-group">
            <button onClick={() => setTheme('light')} className={`theme-btn ${theme === 'light' ? 'active' : ''}`} title="Light Mode">☀️</button>
            <button onClick={() => setTheme('dark')} className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} title="Dark Mode">🌙</button>
          </div>
        </div>
      </div>

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