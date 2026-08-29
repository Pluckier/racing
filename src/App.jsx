import React, { useState, useEffect, useRef } from 'react';
import AuthGuard from './components/security/AuthGuard';
import { useAppState } from './hooks/useAppState';
import { useNonRunnerNotifications } from './hooks/useNonRunnerNotifications';
import SkeletonRaceCard from './components/skeletons/SkeletonRaceCard';
import SkeletonRaceTimeline from './components/skeletons/SkeletonRaceTimeline';
import RaceTimeline from './components/race/RaceTimeline';
import Modal from './components/common/Modal';
import OddsMovementSummary from './components/modals/OddsMovementSummary';
import TrainerSelections from './components/modals/TrainerSelections';
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
  const state = useAppState();
  const [refreshMinutes, setRefreshMinutes] = useState(15);
  const aiMode = useStore((store) => store.aiMode);
  const toggleAi = useStore((store) => store.toggleAi);
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
  }, [state.races]);

  // Set default filters on mount: Value (⭐), Fiddle (🎻), and Select (🎯)
  useEffect(() => {
    state.setFilters(prev => ({
      ...prev,
      value: true,
      fiddle: true,
      select: true
    }));
  }, []);

  const [viewMode, setViewMode] = useState('single'); // 'all' (Grid) or 'single'
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

  const { notifications, removeNotification } = useNonRunnerNotifications(state.races, state.displayDate);
  const [isNotificationsReleased, setIsNotificationsReleased] = useState(false);

  // Automatically reset the release flag once all current notifications are cleared or timed out
  useEffect(() => {
    if (isNotificationsReleased && notifications.length === 0) {
      setIsNotificationsReleased(false);
    }
  }, [notifications.length, isNotificationsReleased]);

  // Local-safe date string generation (ISO strings use UTC and can cause off-by-one day errors)
  const currentDateStr = state.displayDate instanceof Date
    ? `${state.displayDate.getFullYear()}-${String(state.displayDate.getMonth() + 1).padStart(2, '0')}-${String(state.displayDate.getDate()).padStart(2, '0')}`
    : state.displayDate;

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

  function playAudioWithRetry(src, retries = 3, delay = 1000) {
    const audio = new Audio(src);

    audio.play().catch((error) => {
      // Check if we have retries left
      if (retries > 0) {
        console.warn(`Audio playback failed. Retrying in ${delay}ms... (${retries} retries left)`, error);

        setTimeout(() => {
          // Appending a timestamp forces the browser to bypass any broken connections or bad cache
          const freshSrc = `${src}?t=${Date.now()}`;
          playAudioWithRetry(freshSrc, retries - 1, delay * 1.5);
        }, delay);
      } else {
        console.error(`Audio failed to play after multiple attempts for source: ${src}`);
      }
    });
  }


  // Global timer to check for upcoming races with enabled alarms
  useEffect(() => {
    // FIXED: Arrays use .length, not .size
    if (enabledAlarms.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();

      state.races.forEach(race => {
        const id = `${race.time}${race.place.replace(/\s+/g, '')}`;

        // 1. Is this alarm actively enabled by the user in the Zustand store?
        if (enabledAlarms.includes(id)) {
          const [hours, minutes] = race.time.split(':').map(Number);
          const raceDate = new Date();
          raceDate.setHours(hours, minutes, 0, 0);

          const triggerTime = raceDate.getTime() - 240000; // 4 minutes before

          // 2. Are we inside the 2-minute alarm trigger window?
          if (now.getTime() >= triggerTime && now.getTime() < raceDate.getTime()) {

            // 3. Play the audio file with automatic retry logic
            playAudioWithRetry('music.mp3');

            // 4. FIXED: Instantly remove it from the store as requested.
            removeAlarm(id);
          }
          else if (now.getTime() >= raceDate.getTime()) {
            removeAlarm(id);
          }
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [enabledAlarms, state.races, removeAlarm]);

  // Only attach hashchange listener; don't scroll on effect re-run
  useEffect(() => {
    const handleHashSync = () => {
      if (state.loading) return;

      const hash = decodeURIComponent(window.location.hash.substring(1));

      if (!hash) {
        if (state.filteredRaces.length > 0) {
          let selectedRace = state.filteredRaces[0];

          // Find the next race if display date is today
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

          if (currentDateStr === todayStr) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const upcomingRace = state.filteredRaces.find(r => {
              if (!r.time) return false;
              const [hours, minutes] = r.time.split(':').map(Number);
              return (hours * 60 + minutes) >= currentMinutes;
            });
            if (upcomingRace) {
              selectedRace = upcomingRace;
            }
          }

          const targetId = `${selectedRace.time}${selectedRace.place.replace(/\s+/g, '')}`;
          window.location.hash = `${currentDateStr}@${targetId}`;
        }
        return;
      }

      let raceId = hash;
      if (hash.includes('@')) {
        const [datePart, idPart] = hash.split('@');
        raceId = idPart;

        if (datePart && datePart !== currentDateStr) {
          const [y, m, d] = datePart.split('-').map(Number);
          state.setDisplayDate(new Date(y, m - 1, d));
          return;
        }
      }

      const index = state.filteredRaces.findIndex(r =>
        `${r.time}${r.place.replace(/\s+/g, '')}` === raceId
      );

      if (index !== -1) {
        setActiveRaceIndex(index);
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    handleHashSync();
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, [viewMode, state.loading, state.displayDate, state.setDisplayDate, currentDateStr, state.filteredRaces]);

  // Ensure index stays in bounds if filters reduce the number of races
  useEffect(() => {
    if (activeRaceIndex >= state.filteredRaces.length && state.filteredRaces.length > 0) {
      setActiveRaceIndex(state.filteredRaces.length - 1);
    }
  }, [state.filteredRaces.length, activeRaceIndex]);

  useEffect(() => {
    setRaceNumberInput(String(activeRaceIndex + 1));
  }, [activeRaceIndex]);

  const jumpToRaceNumber = (value) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > state.filteredRaces.length) {
      setRaceNumberInput(String(activeRaceIndex + 1));
      return;
    }
    const race = state.filteredRaces[num - 1];
    window.location.hash = `${currentDateStr}@${race.time}${race.place.replace(/\s+/g, '')}`;
  };

  // Automatically jump to the first available race when 'Follow' mode is enabled
  useEffect(() => {
    if (state.filters.follow && state.filteredRaces.length > 0) {
      setActiveRaceIndex(0);
      const firstRace = state.filteredRaces[0];

      // Update hash to ensure the "Single" view and background scroll stay in sync
      window.location.hash = `${currentDateStr}@${firstRace.time}${firstRace.place.replace(/\s+/g, '')}`;
    }
  }, [state.filters.follow, state.filteredRaces, state.displayDate]);

  // 🟢 SET TO 'false' TO DISABLE AUTH GUARD
  const AUTH_ACTIVE = false;

  // 1. Define your UI in a single block
  const content = (auth = {}) => {
    const activeRace = state.filteredRaces[activeRaceIndex] || state.filteredRaces[0];
    const activeRaceId = activeRace ? `${activeRace.time}${activeRace.place.replace(/\s+/g, '')}` : null;

    const CpuIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="16" x="4" y="4" rx="2" />
        <rect width="6" height="6" x="9" y="9" rx="1" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
      </svg>
    );

    const ClaudeIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a1 1 0 0 1 1 1v4.757l3.364-3.364a1 1 0 1 1 1.414 1.414L14.414 9H19a1 1 0 1 1 0 2h-4.757l3.364 3.364a1 1 0 0 1-1.414 1.414L13 12.414V17a1 1 0 1 1-2 0v-4.757l-3.364 3.364a1 1 0 0 1-1.414-1.414L9.586 11H5a1 1 0 1 1 0-2h4.757L6.393 5.636a1 1 0 0 1 1.414-1.414L11 7.586V3a1 1 0 0 1 1-1z" />
      </svg>
    );

    const ChatGptIcon = () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Center Core */}
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />

        {/* Symmetrical Swirl Loops */}
        <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(0 12 12)" />
        <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(120 12 12)" />
        <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(180 12 12)" />
        <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(240 12 12)" />
        <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(300 12 12)" />
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
          displayDate: state.displayDate,
          setDisplayDate: state.setDisplayDate,
          formattedDateTime: state.formattedDateTime,
          summaryTime: state.formattedDateTime.match(/\d{2}:\d{2}/)?.[0],
          detailsContent: (
            <>
              <div className="app-header-controls">
                <SearchOverlay
                  races={state.error ? [] : state.races}
                  viewMode={viewMode}
                  currentDateStr={currentDateStr}
                />
                <TrackWorker />
                <button
                  className={`filter-btn chat-btn ${state.showChat ? 'active' : ''}`}
                  onClick={() => state.setShowChat(!state.showChat)}
                  title={state.showChat ? "Close Chat" : "Open Chat"}
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
                  <button onClick={() => state.setTheme('light')} className={`theme-btn ${state.theme === 'light' ? 'active' : ''}`} title="Light Mode">☀️</button>
                  <button onClick={() => state.setTheme('dark')} className={`theme-btn ${state.theme === 'dark' ? 'active' : ''}`} title="Dark Mode">🌙</button>
                </div>
              </div>

              <RaceTimeline races={state.filteredRaces} theme={state.theme} />
              <FilterBar
                filters={state.filters}
                setFilters={state.setFilters}
                uniquePlaces={state.uniquePlaces}
                onShowMovement={() => state.setActiveModal('movement')}
                onShowTrainers={() => state.setActiveModal('trainers')}
              />
            </>
          )
        }}
        searchRaces={state.error ? [] : state.races}
      >
        {state.loading && state.races.length === 0 ? (
          <>
            <SkeletonRaceTimeline />
            <SkeletonRaceCard />
            <SkeletonRaceCard />
            <SkeletonRaceCard />
          </>
        ) : state.error ? (
          <div className="full-page-center">
            <p className="error">Error: {state.error}</p>
            <button className="filter-btn error-retry-btn" onClick={() => {
              // Clear the URL state (hash and search) so synchronization doesn't pull us back to the old date

              window.history.replaceState(null, '', window.location.pathname);
              state.setDisplayDate(new Date());
            }}>
              Go to Today
            </button>
          </div>
        ) : (
          <>
            <div className="view-controls-and-nav" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', margin: '10px 0px 10px' }}>
              {viewMode === 'single' && state.filteredRaces.length > 0 && (
                <button
                  className="race-analytics-btn"
                  disabled={activeRaceIndex === 0}
                  style={{ 
                    flex: 1, 
                    padding: '21px 0',
                    /* Adds conditional visual styling */
                    opacity: activeRaceIndex === 0 ? 0.5 : 1,
                    cursor: activeRaceIndex === 0 ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => {
                    const race = state.filteredRaces[activeRaceIndex - 1];
                    window.location.hash = `${currentDateStr}@${race.time}${race.place.replace(/\s+/g, '')}`;
                  }}
                >← Prev</button>
              )}

              {/* Center Container: Columns stack vertically */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button
                  className="filter-btn active"
                  onClick={() => setViewMode(prev => prev === 'all' ? 'single' : 'all')}
                  title="Toggle View Mode"
                  style={{
                    borderRadius: '25px',
                    padding: '6px 18px',
                    minWidth: '10viewMode0px'
                  }}
                >
                  {viewMode === 'all' ? 'All 👀' : 'One 👀'}
                </button>

                {/* Counter only renders here below the button if viewMode is 'single' */}
                {viewMode === 'single' && state.filteredRaces.length > 0 && (
                  <span className="race-number-counter">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="race-number-input"
                      aria-label="Race number"
                      style={{ width: `${Math.max(3, String(state.filteredRaces.length).length)}ch` }}
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
                    / {state.filteredRaces.length}
                  </span>
                )}
              </div>

              {viewMode === 'single' && state.filteredRaces.length > 0 && (
                <button
                  className="race-analytics-btn"
                  disabled={activeRaceIndex === state.filteredRaces.length - 1}
                  style={{ 
                    flex: 1, 
                    padding: '21px 0',
                    /* Matches the same visual disabled states */
                    opacity: activeRaceIndex >= state.filteredRaces.length - 1 ? 0.5 : 1,
                    cursor: activeRaceIndex >= state.filteredRaces.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => {
                    const race = state.filteredRaces[activeRaceIndex + 1];
                    window.location.hash = `${currentDateStr}@${race.time}${race.place.replace(/\s+/g, '')}`;
                  }}
                >Next →</button>
              )}
            </div>

            {state.showNextRaceBanner && (
              <div className="next-race-banner">
                🕒 Race finished. Moved to next scheduled off...
              </div>
            )}

            <Modal
              isOpen={!!state.activeModal}
              onClose={() => state.setActiveModal(null)}
              title={state.activeModal === 'movement' ? "Card-wide Odds Movement" : "Today's Trainers & Jockeys (Hot 🟠)"}
            >
              {state.activeModal === 'movement' && (
                <OddsMovementSummary races={state.filteredRaces} onClose={() => state.setActiveModal(null)} />
              )}
              {state.activeModal === 'trainers' && (
                <TrainerSelections races={state.filteredRaces} onClose={() => state.setActiveModal(null)} />
              )}
            </Modal>

            {viewMode === 'single' ? (
              <div style={{ display: 'block' }}>
                {state.filteredRaces.length > 0 ? (
                  <RaceCard
                    race={state.filteredRaces[activeRaceIndex] || state.filteredRaces[0]}
                    allRaces={state.filteredRaces}
                    highlightFiddles={state.filters.fiddle}
                    highlightValues={state.filters.value}
                    highlightSelects={state.filters.select}
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
                  races={state.filteredRaces}
                  filters={state.filters}
                  enabledAlarms={enabledAlarms}
                  toggleAlarm={toggleAlarm}
                  viewMode={viewMode}
                  currentDateStr={currentDateStr}
                />
              </div>
            )}
          </>
        )}

        {state.showChat && <Chatter onClose={() => state.setShowChat(false)} />}

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
