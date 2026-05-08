import { useState, useMemo } from 'react';
import { useClock } from './useClock';
import { useRaces } from './useRaces';
import { useTheme } from './useTheme';
import { useFilteredRaces } from './useFilteredRaces';
import { useNextRaceBanner } from './useNextRaceBanner';
import { useAutoScroll } from './useAutoScroll';
import { formatDisplayDateTime } from '../utils/dateUtils';

export function useAppState() {
  const [displayDate, setDisplayDate] = useState(() => new Date());
  const currentTime = useClock();
  const [showChat, setShowChat] = useState(false);
  const { races, loading, error, refreshCooldown, handleManualRefresh } = useRaces(displayDate);
  
  const [filters, setFilters] = useState({
    places: [],
    tricast: false,
    follow: false,
    value: false,
    fiddle: false
  });
  
  const [theme, setTheme] = useTheme();
  const [activeModal, setActiveModal] = useState(null); // 'movement', 'favorites', or null

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
    showChat, setShowChat,
    races, loading, error, refreshCooldown, handleManualRefresh,
    filters, setFilters,
    activeModal, setActiveModal,
    formattedDateTime, uniquePlaces, filteredRaces, showNextRaceBanner
  };
}