import React, { useState, useEffect } from 'react';
import AuthGuard from './components/security/AuthGuard';
import { useAppState } from './hooks/useAppState';
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
import './css/App.css';
function App() {
  const s = useAppState(); 
  const [viewMode, setViewMode] = useState('all'); // 'all' (Grid) or 'single'
  const [activeRaceIndex, setActiveRaceIndex] = useState(0);

  // Synchronize activeRaceIndex with URL hash (from Timeline, Search, or navigation)
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash.substring(1);
      if (!hash) return;
      
      const index = s.filteredRaces.findIndex(r => 
        `${r.time}${r.place.replace(/\s+/g, '')}` === hash
      );
      
      if (index !== -1) {
        setActiveRaceIndex(index);
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    handleHashSync(); // Sync on mount or when filteredRaces changes
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, [s.filteredRaces]);

  // Ensure index stays in bounds if filters reduce the number of races
  useEffect(() => {
    if (activeRaceIndex >= s.filteredRaces.length && s.filteredRaces.length > 0) {
      setActiveRaceIndex(s.filteredRaces.length - 1);
    }
  }, [s.filteredRaces.length, activeRaceIndex]);

  // 🟢 SET TO 'false' TO DISABLE AUTH GUARD
  const AUTH_ACTIVE = false;

  // 1. Define your UI in a single block
  const content = (auth = {}) => (
    <Layout 
      navProps={{
        theme: s.theme, 
        setTheme: s.setTheme,
        onRefresh: s.handleManualRefresh, 
        refreshCooldown: s.loading || s.refreshCooldown,
        displayDate: s.displayDate, 
        setDisplayDate: s.setDisplayDate,
        formattedDateTime: s.formattedDateTime,
        onShowChat: () => s.setShowChat(!s.showChat),
        isChatOpen: s.showChat
      }}
      searchRaces={s.loading || s.error ? [] : s.races}
    >
      {s.loading ? (
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
          <FilterBar 
            filters={s.filters} 
            setFilters={s.setFilters} 
            uniquePlaces={s.uniquePlaces} 
            onShowMovement={() => s.setActiveModal('movement')} 
            onShowFavorites={() => s.setActiveModal('favorites')} 
          />

          <div className="view-toggle-container" style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
            <div style={{ 
              display: 'flex', 
              backgroundColor: 'var(--bg-card)', 
              borderRadius: '25px', 
              padding: '4px',
              border: '1px solid var(--border)'
            }}>
              <button 
                className={`filter-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
                style={{ border: 'none', margin: 0, padding: '6px 15px' }}
              >
                List
              </button>
              <button 
                className={`filter-btn ${viewMode === 'single' ? 'active' : ''}`}
                onClick={() => setViewMode('single')}
                style={{ border: 'none', margin: 0, padding: '6px 15px' }}
              >
                Single
              </button>
            </div>
          </div>

          {viewMode === 'single' && s.filteredRaces.length > 0 && (
            <div className="single-race-nav" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
              <button 
                className="race-analytics-btn" 
                disabled={activeRaceIndex === 0}
                onClick={() => {
                  const race = s.filteredRaces[activeRaceIndex - 1];
                  window.location.hash = `${race.time}${race.place.replace(/\s+/g, '')}`;
                }}
              >← Prev</button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-h)', fontWeight: 'bold' }}>
                {activeRaceIndex + 1} / {s.filteredRaces.length}
              </span>
              <button 
                className="race-analytics-btn" 
                disabled={activeRaceIndex === s.filteredRaces.length - 1}
                onClick={() => {
                  const race = s.filteredRaces[activeRaceIndex + 1];
                  window.location.hash = `${race.time}${race.place.replace(/\s+/g, '')}`;
                }}
              >Next →</button>
            </div>
          )}

          {s.showNextRaceBanner && (
            <div className="next-race-banner">
              🕒 Race finished. Moved to next scheduled off...
            </div>
          )}
          
          <details className="timeline-details" open>
            <summary className="timeline-summary">⏱️ {s.formattedDateTime.match(/\d{2}:\d{2}/)?.[0]}</summary>
            <RaceTimeline races={s.filteredRaces} theme={s.theme} />
          </details>

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
              />
            ) : (
              <div className="no-data" style={{ textAlign: 'center', padding: '20px' }}>No races match filters.</div>
            )}
          </div>

          <div style={{ display: viewMode === 'all' ? 'block' : 'none' }}>
            <RaceGrid races={s.filteredRaces} filters={s.filters} />
          </div>
        </>
      )}

      {s.showChat && <Chatter onClose={() => s.setShowChat(false)} />}
    </Layout>
  );

  // 2. Return the UI wrapped ONLY if auth is active
  if (!AUTH_ACTIVE) return content();

  return (
    <AuthGuard>
      {(authData) => content(authData)}
    </AuthGuard>
  );
}

export default App;
