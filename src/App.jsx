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
import NonRunnerNotifications from './components/layout/NonRunnerNotifications';
import './css/App.css';
import './css/Notifications.css';
function App() {
  const s = useAppState(); 
  const [refreshMinutes, setRefreshMinutes] = useState(15);

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

  const [viewMode, setViewMode] = useState('all'); // 'all' (Grid) or 'single'
  const [activeRaceIndex, setActiveRaceIndex] = useState(0);
  const { notifications, removeNotification } = useNonRunnerNotifications(s.races, s.displayDate);
  const [isNotificationsReleased, setIsNotificationsReleased] = useState(false);

  // Automatically reset the release flag once all current notifications are cleared or timed out
  useEffect(() => {
    if (isNotificationsReleased && notifications.length === 0) {
      setIsNotificationsReleased(false);
    }
  }, [notifications.length, isNotificationsReleased]);
  
  // Centralized date string for consistent URL hash generation
  const currentDateStr = s.displayDate instanceof Date 
    ? s.displayDate.toISOString().split('T')[0] 
    : s.displayDate;

  const [enabledAlarms, setEnabledAlarms] = useState(new Set());
  const [playedAlarms, setPlayedAlarms] = useState(new Set());

  // Ref to track played alarms to avoid stale closures in the timer interval
  const playedAlarmsRef = useRef(playedAlarms);
  playedAlarmsRef.current = playedAlarms;

  const toggleAlarm = (raceId) => {
    setEnabledAlarms(prev => {
      const next = new Set(prev);
      if (next.has(raceId)) next.delete(raceId);
      else next.add(raceId);
      return next;
    });
  };

  // Reset played tracking when the date changes
  useEffect(() => {
    setPlayedAlarms(new Set());
  }, [s.displayDate]);

  // Global timer to check for upcoming races with enabled alarms
  useEffect(() => {
    if (enabledAlarms.size === 0) return;
    const interval = setInterval(() => {
      const now = new Date();
      s.races.forEach(race => {
        const id = `${race.time}${race.place.replace(/\s+/g, '')}`;
        // Access the latest `playedAlarms` from the ref
        if (enabledAlarms.has(id) && !playedAlarmsRef.current.has(id)) {
          const [hours, minutes] = race.time.split(':').map(Number);
          const raceDate = new Date();
          raceDate.setHours(hours, minutes, 0, 0);

          const triggerTime = raceDate.getTime() - 120000; // 2 minutes before
          if (now.getTime() >= triggerTime && now.getTime() < raceDate.getTime()) {
            new Audio('music.mp3').play().catch(() => {});
            // Update state AND ref immediately to ensure the next 10s tick sees it as "played"
            setPlayedAlarms(prev => {
              const next = new Set(prev).add(id);
              playedAlarmsRef.current = next;
              return next;
            });
          }
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [enabledAlarms, s.races]); 

  // Synchronize activeRaceIndex with URL hash (from Timeline, Search, or navigation)
  useEffect(() => {
    // If we're still loading, wait for the data to arrive and DOM to render
    if (s.loading) return;

    const handleHashSync = () => {
      const hash = decodeURIComponent(window.location.hash.substring(1));
      if (!hash) return;
      
      let raceId = hash;
      if (hash.includes('@')) {
        const [datePart, idPart] = hash.split('@');
        raceId = idPart;

        // If the date in the URL is different from the app's current date, switch it.
        if (datePart && datePart !== currentDateStr) {
          s.setDisplayDate(new Date(datePart));
          // Return early. Once the new date's data is fetched and loading is false,
          // this useEffect will re-run and find the raceId in the new race list.
          return;
        }
      }

      const index = s.filteredRaces.findIndex(r => 
        `${r.time}${r.place.replace(/\s+/g, '')}` === raceId
      );
      
      if (index !== -1) {
        setActiveRaceIndex(index);
        // Jump to the race element once it has been rendered in the DOM
        if (viewMode === 'all') {
          let retries = 0;
          const tryScroll = () => {
            const element = document.getElementById(raceId);
            if (element) {
              element.scrollIntoView({ behavior: 'auto', block: 'start' });
            } else if (retries < 10) { // Retry for up to 1 second if DOM is still updating
              retries++;
              setTimeout(tryScroll, 100);
            }
          };
          tryScroll();
        }
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    handleHashSync(); // Sync on mount or when filteredRaces changes
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, [s.filteredRaces, viewMode, s.loading, s.displayDate, s.setDisplayDate]);

  // Ensure index stays in bounds if filters reduce the number of races
  useEffect(() => {
    if (activeRaceIndex >= s.filteredRaces.length && s.filteredRaces.length > 0) {
      setActiveRaceIndex(s.filteredRaces.length - 1);
    }
  }, [s.filteredRaces.length, activeRaceIndex]);

  // Automatically jump to the first available race when 'Follow' mode is enabled
  useEffect(() => {
    if (s.filters.follow && s.filteredRaces.length > 0) {
      setActiveRaceIndex(0);
      const firstRace = s.filteredRaces[0];

      const currentDateStr = s.displayDate instanceof Date 
        ? s.displayDate.toISOString().split('T')[0] 
        : s.displayDate;

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

    return (
    <Layout 
      navProps={{
        theme: s.theme, 
        setTheme: s.setTheme,
        displayDate: s.displayDate, 
        setDisplayDate: s.setDisplayDate,
        formattedDateTime: s.formattedDateTime,
        onShowChat: () => s.setShowChat(!s.showChat),
        isChatOpen: s.showChat,
        notificationCount: isNotificationsReleased ? 0 : notifications.length,
        onReleaseNotifications: () => setIsNotificationsReleased(true),
        refreshMinutes
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
          <button className="filter-btn error-retry-btn" onClick={() => s.setDisplayDate(new Date())}>
            Go to Today
          </button>
        </div>
      ) : (
        <>
          <details className="timeline-details" open>
            <summary className="timeline-summary">⏱️ {s.formattedDateTime.match(/\d{2}:\d{2}/)?.[0]}</summary>
            <RaceTimeline races={s.filteredRaces} theme={s.theme} />
            <FilterBar 
              filters={s.filters} 
              setFilters={s.setFilters} 
              uniquePlaces={s.uniquePlaces} 
              onShowMovement={() => s.setActiveModal('movement')} 
              onShowFavorites={() => s.setActiveModal('favorites')} 
            />
          </details>
          
          <div className="view-controls-and-nav" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', margin: '5px 20px 15px', width: 'calc(100% - 40px)' }}>
            {viewMode === 'single' && s.filteredRaces.length > 0 && (
              <button
                className="race-analytics-btn" 
                disabled={activeRaceIndex === 0}
                style={{ flex: 1, padding: '18px 0' }}
                onClick={() => {
                  const race = s.filteredRaces[activeRaceIndex - 1];
                  window.location.hash = `${currentDateStr}@${race.time}${race.place.replace(/\s+/g, '')}`;
                }}
              >← Prev</button>
            )}

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

            {viewMode === 'single' && s.filteredRaces.length > 0 && (
              <>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-h)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {activeRaceIndex + 1} / {s.filteredRaces.length}
                </span>
                <button
                className="race-analytics-btn" 
                disabled={activeRaceIndex === s.filteredRaces.length - 1}
                style={{ flex: 1, padding: '18px 0' }}
                onClick={() => {
                  const race = s.filteredRaces[activeRaceIndex + 1];
                  window.location.hash = `${currentDateStr}@${race.time}${race.place.replace(/\s+/g, '')}`;
                }}
                >Next →</button>
              </>
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
          
          <div style={{ display: viewMode === 'single' ? 'block' : 'none' }}>
            {s.filteredRaces.length > 0 ? (
              <RaceCard 
                race={s.filteredRaces[activeRaceIndex] || s.filteredRaces[0]} 
                allRaces={s.filteredRaces}
                highlightFiddles={s.filters.fiddle}
                highlightValues={s.filters.value}
                highlightSelects={s.filters.select}
                isAlarmEnabled={enabledAlarms.has(activeRaceId)}
                onToggleAlarm={() => toggleAlarm(activeRaceId)}
              />
            ) : (
              <div className="no-data" style={{ textAlign: 'center', padding: '20px' }}>No races match filters.</div>
            )}
          </div>

          <div style={{ display: viewMode === 'all' ? 'block' : 'none' }}>
            <RaceGrid 
              races={s.filteredRaces} 
              filters={s.filters} 
              enabledAlarms={enabledAlarms}
              toggleAlarm={toggleAlarm}
            />
          </div>
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
