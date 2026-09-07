import React, { useEffect } from 'react';

const NotificationItem = ({ notification, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(notification.id);
    }, 8000); // Visible for 8 seconds
    return () => clearTimeout(timer);
  }, [notification.id, onRemove]);

  return (
    <div className="nr-notification-item">
      <div className="nr-notification-content">
        <span className="nr-icon">🚫</span>
        <span className="nr-message">
          <strong>{notification.name}</strong> is now a non-runner in the {notification.race}
        </span>
      </div>
      <button className="nr-close-btn" onClick={() => onRemove(notification.id)}>×</button>
    </div>
  );
};

const NonRunnerNotifications = ({ notifications, onRemove, onClearAll }) => {
  if (!notifications.length) return null;

  return (
    <div className="nr-notifications-container">
      {/* 1. Individual horse notifications render first */}
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}

      {/* 2. Clear All block renders last, pinning it to the bottom of the stack */}
      {notifications.length > 1 && (
        <div className="nr-notification-item nr-clear-all-item">
          <div className="nr-notification-content">
            <span className="nr-message">You have {notifications.length} new updates</span>
          </div>
          <button className="nr-clear-all-btn" onClick={onClearAll}>
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default NonRunnerNotifications;
