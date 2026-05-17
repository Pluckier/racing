import { useState, useMemo, useEffect } from 'react';
import { useClock } from './useClock';
import { useRaces } from './useRaces';
import { useTheme } from './useTheme';
import { useFilteredRaces } from './useFilteredRaces';
import { useNextRaceBanner } from './useNextRaceBanner';
import { useAutoScroll } from './useAutoScroll';
import { formatDisplayDateTime } from '../utils/dateUtils';

export function useAppState() {
  const [displayDate, setDisplayDate] = useState(() => {
    const hash = decodeURIComponent(window.location.hash.substring(1));
    if (hash.includes('@')) {
      const datePart = hash.split('@')[0];
      const parsed = new Date(datePart);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  const currentTime = useClock();
  const [showChat, setShowChat] = useState(false);
  const { races, loading, error, handleManualRefresh, lastRefreshTime } = useRaces(displayDate);
  
  const [filters, setFilters] = useState({
    places: [],
    tricast: false,
    follow: false,
    value: false,
    fiddle: false
  });
  
  const [theme, setTheme] = useTheme();
  const [activeModal, setActiveModal] = useState(null); // 'movement', 'favorites', or null

  // Auto-refresh logic: trigger a refresh every 15 minutes
  useEffect(() => {
    const AUTO_REFRESH_MS = 15 * 60 * 1000;
    if (lastRefreshTime > 0) {
      const timeSinceUpdate = currentTime.getTime() - lastRefreshTime;
      if (timeSinceUpdate >= AUTO_REFRESH_MS) {
        handleManualRefresh();
      }
    }
  }, [currentTime, lastRefreshTime, handleManualRefresh]);

  const formattedDateTime = useMemo(() => 
    formatDisplayDateTime(displayDate, currentTime), 
    [currentTime, displayDate]
  );

  const uniquePlaces = useMemo(() => 
    [...new Set((Array.isArray(races) ? races : []).map(r => r.place))].sort(),
    [races]
  );

  const filteredRaces = useFilteredRaces(races, filters, currentTime, displayDate);
  const showNextRaceBanner = useNextRaceBanner(filteredRaces.length, currentTime, filters.follow, displayDate);
  
  useAutoScroll(loading, filteredRaces);

  return {
    displayDate, setDisplayDate,
    theme, setTheme,
    showChat, setShowChat, currentTime,
    races, loading, error,
    filters, setFilters, lastRefreshTime,
    activeModal, setActiveModal,
    formattedDateTime, uniquePlaces, filteredRaces, showNextRaceBanner
  };
}