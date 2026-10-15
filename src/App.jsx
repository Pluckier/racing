import React, { useState, useEffect } from 'react';
import AuthGuard from './components/security/AuthGuard';
import { useAppState } from './hooks/useAppState';
import { useNonRunnerNotifications } from './hooks/useNonRunnerNotifications';
import { useAlarms } from './hooks/useAlarms';
import { useCountdown } from './hooks/useCountdown';
import { useHashSync } from './hooks/useHashSync';
import SkeletonRaceCard from './components/skeletons/SkeletonRaceCard';
import SkeletonRaceTimeline from './components/skeletons/SkeletonRaceTimeline';
import RaceTimeline from './components/race/RaceTimeline';
import Modal from './components/common/Modal';
import SystemRacesModal from './components/modals/SystemRacesModal';
import OddsMovementSummary from './components/modals/OddsMovementSummary';
import TrainerSelections from './components/modals/TrainerSelections';
import NotesModal from './components/modals/NotesModal';
import GridDarkSocialShareDropdown from './components/layout/DropShare';
import Layout from './components/layout/Layout';
import FilterBar from './components/filters/FilterBar';
import RaceGrid from './components/race/RaceGrid';
import RaceCard from './components/race/Racecard';
import Chatter from './components/chat/Chatter';
import NonRunnerNotifications from './components/layout/NonRunnerNotifications';
import TrackWorker from './components/obs/TrackWorker';
import SearchOverlay from './components/layout/SearchOverlay';
import './css/App.css';
import './css/Notifications.css';
import HelpPage from './components/common/HelpPage';
import AntiSpamWrapper from './components/security/AntiSpamWrapper';

function App() {
  const state = useAppState();
  const refreshMinutes = useCountdown(state.races, 15);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [viewMode, setViewMode] = useState('single'); // 'all' (Grid) or 'single'
  const [showNonRunnerNotifications, setShowNonRunnerNotifications] = useState(false);
  const [showSystem, setShowSystem] = useState(false);

  // Set default filters on mount: Value (⭐), Fiddle (🎻), and Select (🎯)
  const { setFilters } = state;
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      value: true,
      fiddle: true,
      select: true
    }));
  }, [setFilters]);

  const {
    notifications,
    pendingNonRunners,
    approvedNonRunners,
    rejectedNonRunners,
    acceptNotification,
    rejectNotification,
    clearAll,
  } = useNonRunnerNotifications(state.races, state.displayDate);

  // Auto-close panel once user has dealt with every notification
  if (notifications.length === 0 && showNonRunnerNotifications) {
    setShowNonRunnerNotifications(false);
  }

  // Local-safe date string generation (ISO strings use UTC and can cause off-by-one day errors)
  const currentDateStr = state.displayDate instanceof Date
    ? `${state.displayDate.getFullYear()}-${String(state.displayDate.getMonth() + 1).padStart(2, '0')}-${String(state.displayDate.getDate()).padStart(2, '0')}`
    : state.displayDate;

  const { enabledAlarms, toggleAlarm, isAlarmEnabled } = useAlarms(state.races);

  const {
    activeRaceIndex,
    raceNumberInput,
    setRaceNumberInput,
    jumpToRaceNumber
  } = useHashSync({
    filteredRaces: state.filteredRaces,
    loading: state.loading,
    currentDateStr,
    setDisplayDate: state.setDisplayDate,
    viewMode
  });

  // 🟢 SET TO 'false' TO DISABLE AUTH GUARD
  const AUTH_ACTIVE = false;

  // Define UI in a single block
  const content = () => {
    const activeRace = state.filteredRaces[activeRaceIndex] || state.filteredRaces[0];
    const activeRaceId = activeRace ? `${activeRace.time}${activeRace.place.replace(/\s+/g, '')}` : null;

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

                <button
                  className={`filter-btn help-btn ${isHelpOpen ? 'active' : ''}`}
                  onClick={() => setIsHelpOpen(!isHelpOpen)}
                  title={isHelpOpen ? "Close Help" : "HELP & Guide"}
                >
                  💡
                </button>

                <TrackWorker />
                <button
                  className={`filter-btn chat-btn ${state.showChat ? 'active' : ''}`}
                  onClick={() => state.setShowChat(!state.showChat)}
                  title={state.showChat ? "Close Chat" : "Open Chat"}
                >
                  💬
                </button>

                <GridDarkSocialShareDropdown url={'https://pluckier.github.io/racing'} title={'Be Luckier, Pick Pluckier 🏇'} />

                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    className={`filter-btn refresh-btn ${notifications.length > 0 ? 'active' : 'disabled'}`}
                    disabled={notifications.length === 0}
                    style={{ cursor: notifications.length > 0 ? 'pointer' : 'default' }}
                    title={notifications.length > 0 ? `Non Runner Alerts ${refreshMinutes}m` : 'No Non Runner Alerts'}
                    onClick={() => setShowNonRunnerNotifications(prev => !prev)}
                  >
                    ↻
                    {notifications.length > 0 && (
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
                        {notifications.length}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setShowSystem(true)}
                  className="filter-btn"
                  title="System: Show R horses"
                >
                  System
                </button>

                <Modal
                  isOpen={showSystem}
                  onClose={() => setShowSystem(false)}
                  title="Racing Analysis"
                >
                  <SystemRacesModal races={state.races} displayDate={state.displayDate} />
                </Modal>

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

              <FilterBar
                filters={state.filters}
                setFilters={state.setFilters}
                uniquePlaces={state.uniquePlaces}
                races={state.races}
                onShowNotes={() => state.setActiveModal('notes')}
                onShowMovement={() => state.setActiveModal('movement')}
                onShowTrainers={() => state.setActiveModal('trainers')}
              />
              <RaceTimeline races={state.filteredRaces} theme={state.theme} currentDateStr={currentDateStr} />
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
              // Clear URL state (hash and search) so synchronization doesn't pull back to old date
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
                    minWidth: '100px'
                  }}
                >
                  {viewMode === 'all' ? 'One 👀' : 'All 👀'}
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

            <Modal
              isOpen={isHelpOpen}
              onClose={() => setIsHelpOpen(false)}
              title="Help, Guide, Icons"
            >
              <HelpPage theme={state.theme} />
            </Modal>

            <Modal
              isOpen={!!state.activeModal}
              onClose={() => state.setActiveModal(null)}
              title={
                state.activeModal === 'movement'
                  ? "Card-wide Odds Movement"
                  : state.activeModal === 'notes'
                    ? "Noted Horses"
                    : "Today's Connections (Hot 🟠)"
              }
            >
              {state.activeModal === 'movement' && (
                <OddsMovementSummary races={state.filteredRaces} onClose={() => state.setActiveModal(null)} currentDateStr={currentDateStr} />
              )}
              {state.activeModal === 'trainers' && (
                <TrainerSelections races={state.filteredRaces} onClose={() => state.setActiveModal(null)} />
              )}
              {state.activeModal === 'notes' && (
                <NotesModal onClose={() => state.setActiveModal(null)} currentDateStr={currentDateStr} races={state.filteredRaces} />
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
                    isAlarmEnabled={isAlarmEnabled(activeRaceId)}
                    onToggleAlarm={() => toggleAlarm(activeRaceId)}
                    viewMode={viewMode}
                    currentDateStr={currentDateStr}
                    pendingNonRunners={pendingNonRunners}
                    approvedNonRunners={approvedNonRunners}
                    rejectedNonRunners={rejectedNonRunners}
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
                  pendingNonRunners={pendingNonRunners}
                  approvedNonRunners={approvedNonRunners}
                  rejectedNonRunners={rejectedNonRunners}
                />
              </div>
            )}
          </>
        )}

        {state.showChat && <Chatter onClose={() => state.setShowChat(false)} />}

        {showNonRunnerNotifications && (
          <NonRunnerNotifications
            notifications={notifications}
            onAccept={acceptNotification}
            onReject={rejectNotification}
            onClearAll={clearAll}
          />
        )}
      </Layout>
    );
  };

  return (
    <AntiSpamWrapper>
      {!AUTH_ACTIVE ? (
        content()
      ) : (
        <AuthGuard>
          {() => content()}
        </AuthGuard>
      )}
    </AntiSpamWrapper>
  );
}

export default App;
