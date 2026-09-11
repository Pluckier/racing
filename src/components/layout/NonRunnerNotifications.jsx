import React from 'react';

const NotificationItem = ({ notification, onAccept, onReject }) => {
  return (
    <div className="nr-notification-item">
      <div className="nr-notification-content">
        <span className="nr-icon">🚫</span>
        <span className="nr-message">
          <strong>{notification.name}</strong> is now a non-runner in the {notification.race}
        </span>
      </div>
      <div className="nr-notification-actions">
        <button
          className="nr-action-btn nr-accept-btn"
          onClick={() => onAccept(notification.id)}
          title="Confirm this horse is a non-runner"
        >
          ✅ Accept NR
        </button>
        <button
          className="nr-action-btn nr-reject-btn"
          onClick={() => onReject(notification.id)}
          title="Reject - keep this horse active"
        >
          ❌ Keep Active
        </button>
      </div>
    </div>
  );
};

const NonRunnerNotifications = ({ notifications, onAccept, onReject, onClearAll }) => {
  if (!notifications.length) return null;

  return (
    <div className="nr-notifications-container">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}

      {notifications.length > 1 && (
        <div className="nr-notification-item nr-clear-all-item">
          <div className="nr-notification-content">
            <span className="nr-message">{notifications.length} non-runner alerts pending</span>
          </div>
          <button className="nr-clear-all-btn" onClick={onClearAll}>
            Accept All
          </button>
        </div>
      )}
    </div>
  );
};

export default NonRunnerNotifications;
