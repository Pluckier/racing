import React, { useState, useEffect, useRef } from 'react';
import AuthGuard from './components/security/AuthGuard';
import { useAppState } from './hooks/useAppState';
import { useNonRunnerNotifications } from './hooks/useNonRunnerNotifications';
import SkeletonRaceCard from './components/skeletons/SkeletonRaceCard';
import SkeletonRaceTimeline from './components/skeletons/SkeletonRaceTimeline';
import RaceTimeline from './components/race/RaceTimeline';
import Modal from './components/common/Modal';
import OddsMovementSummary from './components/modals/OddsMovementSummary';
import FavoriteSelections from './components/modals/FavoriteSelections';
import Layout from './components/layout/Layout';
import FilterBar from './components/filters/FilterBar';
import RaceGrid from './components/race/RaceGrid';
import RaceCard from './components/race/Racecard';
import Chatter from './components/chat/Chatter';
import { useStore } from './store/alarmStore';
import NonRunnerNotifications from './components/layout/NonRunnerNotifications';
import TrackWorker from './components/obs/TrackWorker'; // Import TrackWorker
import SearchOverlay from './components/layout/SearchOverlay'; // Import SearchOverlay
import './css/App.css';
import './css/Notifications.css';

function App() {
  const s = useAppState();
  const [refreshMinutes, setRefreshMinutes] = useState(15);
  const aiMode = useStore((state) => state.aiMode);
  const toggleAi = useStore((state) => state.toggleAi);
  const aiNames = { 0: 0, 1: 1, 2: 2 };

  // Handle the countdown timer for the Auto-Refresh UI
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshMinutes(prev => (prev > 1 ? prev - 1 : 15));
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Reset the countdown whenever the race data is refreshed/updated
  useEffect(() => {
    setRefreshMinutes(15);
  }, [s.races]);

  // Set default filters on mount: Value (⭐), Fiddle (🎻), and Select (🎯)
  useEffect(() => {
    s.setFilters(prev => ({
      ...prev,
      value: true,
      fiddle: true,
      select: true
    }));
  }, []);

  const [viewMode, setViewMode] = useState('all'); // 'all' (Grid) or 'single'
  const [activeRaceIndex, setActiveRaceIndex] = useState(0);
  const [raceNumberInput, setRaceNumberInput] = useState('1');
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const { notifications, removeNotification } = useNonRunnerNotifications(s.races, s.displayDate);
  const [isNotificationsReleased, setIsNotificationsReleased] = useState(false);

  // Automatically reset the release flag once all current notifications are cleared or timed out
  useEffect(() => {
    if (isNotificationsReleased && notifications.length === 0) {
      setIsNotificationsReleased(false);
    }
  }, [notifications.length, isNotificationsReleased]);

  // Local-safe date string generation (ISO strings use UTC and can cause off-by-one day errors)
  const currentDateStr = s.displayDate instanceof Date
    ? `${s.displayDate.getFullYear()}-${String(s.displayDate.getMonth() + 1).padStart(2, '0')}-${String(s.displayDate.getDate()).padStart(2, '0')}`
    : s.displayDate;

  const enabledAlarms = useStore((state) => state.alarms);
  const addAlarm = useStore((state) => state.addAlarm);
  const removeAlarm = useStore((state) => state.removeAlarm);

  const toggleAlarm = (raceId) => {
    if (enabledAlarms.includes(raceId)) {
      removeAlarm(raceId);
    } else {
      addAlarm(raceId);
    }
  };

  // Global timer to check for upcoming races with enabled alarms
  useEffect(() => {
    // FIXED: Arrays use .length, not .size
    if (enabledAlarms.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();

      s.races.forEach(race => {
        const id = `${race.time}${race.place.replace(/\s+/g, '')}`;

        // 1. Is this alarm actively enabled by the user in the Zustand store?
        if (enabledAlarms.includes(id)) {
          const [hours, minutes] = race.time.split(':').map(Number);
          const raceDate = new Date();
          raceDate.setHours(hours, minutes, 0, 0);

          const triggerTime = raceDate.getTime() - 240000; // 4 minutes before

          // 2. Are we inside the 2-minute alarm trigger window?
          if (now.getTime() >= triggerTime && now.getTime() < raceDate.getTime()) {

            // 3. Play the audio file safely
            new Audio('music.mp3').play().catch(() => { });

            // 4. FIXED: Instantly remove it from the store as requested.
            // This breaks the loop naturally because next tick, step 1 will be false!
            removeAlarm(id);
          }
          else if (now.getTime() >= raceDate.getTime()) {
            // 2. FIXED: If the race is already in the past, silently remove it to keep the store clean
            removeAlarm(id);
          }
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [enabledAlarms, s.races, removeAlarm]);

  // Only attach hashchange listener; don't scroll on effect re-run
  useEffect(() => {
    const handleHashSync = () => {
      if (s.loading) return;

      const hash = decodeURIComponent(window.location.hash.substring(1));

      if (!hash) {
        if (s.filteredRaces.length > 0) {
          const firstRace = s.filteredRaces[0];
          const firstId = `${firstRace.time}${firstRace.place.replace(/\s+/g, '')}`;
          window.location.hash = `${currentDateStr}@${firstId}`;
        }
        return;
      }

      let raceId = hash;
      if (hash.includes('@')) {
        const [datePart, idPart] = hash.split('@');
        raceId = idPart;

        if (datePart && datePart !== currentDateStr) {
          const [y, m, d] = datePart.split('-').map(Number);
          s.setDisplayDate(new Date(y, m - 1, d));
          return;
        }
      }

      const index = s.filteredRaces.findIndex(r =>
        `${r.time}${r.place.replace(/\s+/g, '')}` === raceId
      );

      if (index !== -1) {
        setActiveRaceIndex(index);
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    handleHashSync();
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, [viewMode, s.loading, s.displayDate, s.setDisplayDate, currentDateStr, s.filteredRaces]);

  // Ensure index stays in bounds if filters reduce the number of races
  useEffect(() => {
    if (activeRaceIndex >= s.filteredRaces.length && s.filteredRaces.length > 0) {
      setActiveRaceIndex(s.filteredRaces.length - 1);
    }
  }, [s.filteredRaces.length, activeRaceIndex]);

  useEffect(() => {
    setRaceNumberInput(String(activeRaceIndex + 1));
  }, [activeRaceIndex]);

  const jumpToRaceNumber = (value) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > s.filteredRaces.length) {
      setRaceNumberInput(String(activeRaceIndex + 1));
      return;
    }
    const race = s.filteredRaces[num - 1];
    window.location.hash = `${currentDateStr}@${race.time}${race.place.replace(/\s+/g, '')}`;
  };

  // Automatically jump to the first available race when 'Follow' mode is enabled
  useEffect(() => {
    if (s.filters.follow && s.filteredRaces.length > 0) {
      setActiveRaceIndex(0);
      const firstRace = s.filteredRaces[0];

      // Update hash to ensure the "Single" view and background scroll stay in sync
      window.location.hash = `${currentDateStr}@${firstRace.time}${firstRace.place.replace(/\s+/g, '')}`;
    }
  }, [s.filters.follow, s.filteredRaces, s.displayDate]);

  // 🟢 SET TO 'false' TO DISABLE AUTH GUARD
  const AUTH_ACTIVE = false;

  // 1. Define your UI in a single block
  const content = (auth = {}) => {
    const activeRace = s.filteredRaces[activeRaceIndex] || s.filteredRaces[0];
    const activeRaceId = activeRace ? `${activeRace.time}${activeRace.place.replace(/\s+/g, '')}` : null;

    const CpuIcon = () => (
      <svg xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="16" x="4" y="4" rx="2" />
        <rect width="6" height="6" x="9" y="9" rx="1" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
      </svg>
    );
    
    const ClaudeIcon = () => (
      <svg xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a1 1 0 0 1 1 1v4.757l3.364-3.364a1 1 0 1 1 1.414 1.414L14.414 9H19a1 1 0 1 1 0 2h-4.757l3.364 3.364a1 1 0 0 1-1.414 1.414L13 12.414V17a1 1 0 1 1-2 0v-4.757l-3.364 3.364a1 1 0 0 1-1.414-1.414L9.586 11H5a1 1 0 1 1 0-2h4.757L6.393 5.636a1 1 0 0 1 1.414-1.414L11 7.586V3a1 1 0 0 1 1-1z" />
      </svg>
    );
    
    const ChatGptIcon = () => (
      <svg xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.74 11.63a4.19 4.19 0 0 0-.25-1.57 4.29 4.29 0 0 0-.85-1.34 4.39 4.39 0 0 0-1.34-.85A4.6 4.6 0 0 0 16.32 7a4.41 4.41 0 0 0-2.84 1 4.54 4.54 0 0 0-1.48 2.37 4.62 4.62 0 0 0-2.48-.68 4.4 4.4 0 0 0-3.18 1.34 4.51 4.51 0 0 0-1.12 4.48 4.19 4.19 0 0 0 .25 1.57 4.29 4.29 0 0 0 .85 1.34 4.39 4.39 0 0 0 1.34.85A4.31 4.31 0 0 0 11 18.2a4.4 4.4 0 0 0 2.84-1A4.54 4.54 0 0 0 15.32 15a4.62 4.62 0 0 0 2.48.68 4.4 4.4 0 0 0 3.18-1.34 4.51 4.51 0 0 0 .76-2.71zm-9.35 4a2.43 2.43 0 0 1-1.63-.61l3.52-2a.45.45 0 0 0 .23-.39V8.65a2.53 2.53 0 0 1 1.15 2.15 2.56 2.56 0 0 1-2.52 2.53zm-5.63-2.61a2.45 2.45 0 0 1 .42-1.69l3.52 2a.46 4.46 0 0 0 .45 0l3.94-2.27v1a2.53 2.53 0 0 1-1.87 2.44 2.56 2.56 0 0 1-2.89-1l-3.57-2.05zm.88-5.32A2.43 2.43 0 0 1 9.27 7a2.53 2.53 0 0 1 2.3 1.49l-3.52 2a.45.45 0 0 0-.23.39v4A2.53 2.53 0 0 1 6.68 12a2.56 2.56 0 0 1 1-2.31zM16.32 9a2.43 2.43 0 0 1 1.63.61l-3.52 2a.45.45 0 0 0-.23.39v4a2.53 2.53 0 0 1-1.15-2.15A2.56 2.56 0 0 1 15.57 11.3a2.54 2.54 0 0 1 .75-.3zm5.63 2.61a2.45 2.45 0 0 1-.42 1.69l-3.52-2a.46 4.46 0 0 0-.45 0l-3.94 2.27v-1a2.53 2.53 0 0 1 1.87-2.44 2.56 2.56 0 0 1 2.89 1z" />
      </svg>
    );
    
    // 2. Updated clean mapping object utilizing the local SVG components
    const aiButtonConfig = {
      0: { icon: <CpuIcon />, color: '#374151', title: "Turn on AI" },
      1: { icon: <ClaudeIcon />, color: '#F59E0B', title: "Using Claude" },
      2: { icon: <ChatGptIcon />, color: '#10B981', title: "Using ChatGPT" }
    };

    const currentConfig = aiButtonConfig[aiMode] || aiButtonConfig[0];


    return (
      <Layout
        navProps={{
          displayDate: s.displayDate,
          setDisplayDate: s.setDisplayDate,
          formattedDateTime: s.formattedDateTime,
          summaryTime: s.formattedDateTime.match(/\d{2}:\d{2}/)?.[0],
          detailsContent: (
            <>
              <div className="app-header-controls">
                <SearchOverlay
                  races={s.error ? [] : s.races}
                  viewMode={viewMode}
                  currentDateStr={currentDateStr}
                />
                <TrackWorker />
                <button
                  className={`filter-btn chat-btn ${s.showChat ? 'active' : ''}`}
                  onClick={() => s.setShowChat(!s.showChat)}
                  title={s.showChat ? "Close Chat" : "Open Chat"}
                >
                  💬
                </button>

                <button
    onClick={() => toggleAi()}
    className="race-analytics-btn" 
    title={currentConfig.title} // Dynamically updates tooltip text too!
    style={{
      display: 'inline-flex',    // Centers the icon perfectly
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: currentConfig.color,
      color: 'white',
      padding: '4px 4px',        // Adjusted padding slightly to fit icons nicely
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease'
    }}
  >
    {currentConfig.icon}
  </button>

                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    className={`filter-btn refresh-btn ${isNotificationsReleased ? 0 : notifications.length > 0 ? 'active' : 'disabled'}`}
                    disabled={isNotificationsReleased ? 0 : notifications.length === 0}
                    onClick={() => setIsNotificationsReleased(true)}
                    style={{ cursor: (isNotificationsReleased ? 0 : notifications.length > 0) ? 'pointer' : 'default' }}
                    title={
                      (isNotificationsReleased ? 0 : notifications.length > 0)
                        ? `Show ${isNotificationsReleased ? 0 : notifications.length} non-runners`
                        : (refreshMinutes ? `Auto Refresh ${refreshMinutes}m` : "Auto Refresh")
                    }
                  >
                    ↻
                    {(isNotificationsReleased ? 0 : notifications.length > 0) && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        backgroundColor: '#e53e3e',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '2px 6px',
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        zIndex: 2,
                        pointerEvents: 'none'
                      }}>
                        {(isNotificationsReleased ? 0 : notifications.length)}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  onClick={toggleFullscreen}
                  className={`filter-btn ${isFullscreen ? 'active' : ''}`}
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? '⛶ Window' : '⛶ Full'}
                </button>

                <div className="donate-container">
                  <form action="https://www.paypal.com/donate" method="post" target="_blank">
                    <input type="hidden" name="hosted_button_id" value="P9PLRQL24TBAN" />
                    <input type="image" src="https://www.paypalobjects.com/en_GB/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
                    <img alt="" border="0" src="https://www.paypal.com/en_GB/i/scr/pixel.gif" width="1" height="1" />
                  </form>
                </div>
                <div className="theme-toggle-group">
                  <button onClick={() => s.setTheme('light')} className={`theme-btn ${s.theme === 'light' ? 'active' : ''}`} title="Light Mode">☀️</button>
                  <button onClick={() => s.setTheme('dark')} className={`theme-btn ${s.theme === 'dark' ? 'active' : ''}`} title="Dark Mode">🌙</button>
                </div>
              </div>

              <RaceTimeline races={s.filteredRaces} theme={s.theme} />
              <FilterBar
                filters={s.filters}
                setFilters={s.setFilters}
                uniquePlaces={s.uniquePlaces}
                onShowMovement={() => s.setActiveModal('movement')}
                onShowFavorites={() => s.setActiveModal('favorites')}
              />
            </>
          )
        }}
        searchRaces={s.error ? [] : s.races}
      >
        {s.loading && s.races.length === 0 ? (
          <>
            <SkeletonRaceTimeline />
            <SkeletonRaceCard />
            <SkeletonRaceCard />
            <SkeletonRaceCard />
          </>
        ) : s.error ? (
          <div className="full-page-center">
            <p className="error">Error: {s.error}</p>
            <button className="filter-btn error-retry-btn" onClick={() => {
              // Clear the URL state (hash and search) so synchronization doesn't pull us back to the old date

              window.history.replaceState(null, '', window.location.pathname);
              s.setDisplayDate(new Date());
            }}>
              Go to Today
            </button>
          </div>
        ) : (
          <>
            <div className="view-controls-and-nav" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', margin: '10px 0px 10px' }}>
              {viewMode === 'single' && s.filteredRaces.length > 0 && (
                <button
                  className="race-analytics-btn"
                  disabled={activeRaceIndex === 0}
                  style={{ flex: 1, padding: '21px 0' }}
                  onClick={() => {
                    const race = s.filteredRaces[activeRaceIndex - 1];
                    window.location.hash = `${currentDateStr}@${race.time}${race.place.replace(/\s+/g, '')}`;
                  }}
                >← Prev</button>
              )}

              {/* Center Container: Columns stack vertically */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button
                  className="filter-btn active"
                  onClick={() => setViewMode(prev => prev === 'all' ? 'single' : 'all')}
                  style={{
                    borderRadius: '25px',
                    padding: '6px 18px',
                    minWidth: '100px'
                  }}
                >
                  {viewMode === 'all' ? 'All 👀' : 'One 👀'}
                </button>

                {/* Counter only renders here below the button if viewMode is 'single' */}
                {viewMode === 'single' && s.filteredRaces.length > 0 && (
                  <span className="race-number-counter">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="race-number-input"
                      aria-label="Race number"
                      style={{ width: `${Math.max(3, String(s.filteredRaces.length).length)}ch` }}
                      value={raceNumberInput}
                      onChange={(e) => setRaceNumberInput(e.target.value.replace(/\D/g, ''))}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => jumpToRaceNumber(raceNumberInput)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          jumpToRaceNumber(raceNumberInput);
                          e.currentTarget.blur();
                        }
                      }}
                    />
                    / {s.filteredRaces.length}
                  </span>
                )}
              </div>

              {viewMode === 'single' && s.filteredRaces.length > 0 && (
                <button
                  className="race-analytics-btn"
                  disabled={activeRaceIndex === s.filteredRaces.length - 1}
                  style={{ flex: 1, padding: '21px 0' }}
                  onClick={() => {
                    const race = s.filteredRaces[activeRaceIndex + 1];
                    window.location.hash = `${currentDateStr}@${race.time}${race.place.replace(/\s+/g, '')}`;
                  }}
                >Next →</button>
              )}
            </div>

            {s.showNextRaceBanner && (
              <div className="next-race-banner">
                🕒 Race finished. Moved to next scheduled off...
              </div>
            )}

            <Modal
              isOpen={!!s.activeModal}
              onClose={() => s.setActiveModal(null)}
              title={s.activeModal === 'movement' ? "Card-wide Odds Movement" : "Strong Favourites"}
            >
              {s.activeModal === 'movement' && (
                <OddsMovementSummary races={s.filteredRaces} onClose={() => s.setActiveModal(null)} />
              )}
              {s.activeModal === 'favorites' && (
                <FavoriteSelections races={s.filteredRaces} onClose={() => s.setActiveModal(null)} />
              )}
            </Modal>

            {viewMode === 'single' ? (
              <div style={{ display: 'block' }}>
                {s.filteredRaces.length > 0 ? (
                  <RaceCard
                    race={s.filteredRaces[activeRaceIndex] || s.filteredRaces[0]}
                    allRaces={s.filteredRaces}
                    highlightFiddles={s.filters.fiddle}
                    highlightValues={s.filters.value}
                    highlightSelects={s.filters.select}
                    isAlarmEnabled={enabledAlarms.includes(activeRaceId)}
                    onToggleAlarm={() => toggleAlarm(activeRaceId)}
                    viewMode={viewMode}
                    currentDateStr={currentDateStr}
                  />
                ) : (
                  <div className="no-data" style={{ textAlign: 'center', padding: '20px' }}>No races match filters.</div>
                )}
              </div>
            ) : (
              <div style={{ display: 'block' }}>
                <RaceGrid
                  races={s.filteredRaces}
                  filters={s.filters}
                  enabledAlarms={enabledAlarms}
                  toggleAlarm={toggleAlarm}
                  viewMode={viewMode}
                  currentDateStr={currentDateStr}
                />
              </div>
            )}
          </>
        )}

        {s.showChat && <Chatter onClose={() => s.setShowChat(false)} />}

        <NonRunnerNotifications
          notifications={isNotificationsReleased ? notifications : []}
          onRemove={removeNotification}
        />
      </Layout>
    );
  };

  // 2. Return the UI wrapped ONLY if auth is active
  if (!AUTH_ACTIVE) return content();

  return (
    <AuthGuard>
      {(authData) => content(authData)}
    </AuthGuard>
  );
}

export default App;
