import { useState, useMemo, useEffect } from 'react';
import { useClock } from './useClock';
import { useRaces } from './useRaces';
import { useTheme } from './useTheme';
import { useFilteredRaces } from './useFilteredRaces';
import { useAutoScroll } from './useAutoScroll';
import { formatDisplayDateTime } from '../utils/dateUtils';
import { useStore } from '../store/alarmStore';

export function useAppState() {
  const [displayDate, setDisplayDate] = useState(() => {
    const hash = decodeURIComponent(window.location.hash.substring(1));
    if (hash.includes('@')) {
      const datePart = hash.split('@')[0];
      const parts = datePart.split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
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

  const clearSliders = useStore(state => state.clearSliders);
  const refreshFoaled = useStore(state => state.refreshFoaled);

  useEffect(() => {
    setFilters(prev => {
      // Safety optimization: Only trigger a state change if places are actually selected
      if (prev.places.length === 0) return prev;

      return {
        ...prev,
        places: [] // Clear the selected venues array cleanly
      };
    });
    clearSliders();
  }, [displayDate, clearSliders]);

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

  useEffect(() => {
    if (!refreshFoaled) return;
    if (!Array.isArray(races)) return;
    // Recompute legacy 'selectedFoaled' for the newly-loaded races
    refreshFoaled(races);
  }, [races, refreshFoaled]);

  const formattedDateTime = useMemo(() =>
    formatDisplayDateTime(displayDate, currentTime),
    [currentTime, displayDate]
  );

  const uniquePlaces = useMemo(() =>
    [...new Set((Array.isArray(races) ? races : []).map(r => r.place))].sort(),
    [races]
  );

  const filteredRaces = useFilteredRaces(races, filters, currentTime, displayDate);

  useAutoScroll(loading, filteredRaces);

  return {
    displayDate, setDisplayDate,
    theme, setTheme,
    showChat, setShowChat, currentTime,
    races, loading, error,
    filters, setFilters, lastRefreshTime,
    activeModal, setActiveModal,
    formattedDateTime, uniquePlaces, filteredRaces
  };
}