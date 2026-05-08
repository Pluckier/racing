import React, { useState } from 'react';
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
import Chatter from './components/chat/Chatter';
import './css/App.css';
function App() {
  const s = useAppState(); 

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
          
          <RaceGrid races={s.filteredRaces} filters={s.filters} />
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
