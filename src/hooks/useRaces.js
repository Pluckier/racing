import { useState, useEffect, useCallback, useRef } from 'react';

export const useRaces = (displayDate) => {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const lastDateRef = useRef(displayDate);

  const handleManualRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const fetchRaces = async () => {
      setLoading(true);
      setError(null);

      // Seamless logic: only clear data if the date has actually changed.
      if (lastDateRef.current?.toDateString() !== displayDate?.toDateString()) {
        setRaces([]);
        lastDateRef.current = displayDate;
      }

      const day = String(displayDate.getDate()).padStart(2, '0');
      const month = String(displayDate.getMonth() + 1).padStart(2, '0');
      const year = displayDate.getFullYear();
      const dateString = `${day}-${month}-${year}`;

      try {
        const response = await fetch(`https://www.pluckier.co.uk/${dateString}-races.json`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Races for this date are not available');
        
        const data = await response.json();
        if (Array.isArray(data)) {
          setRaces(data);
          setLastRefreshTime(Date.now());
        } else {
          throw new Error('Unexpected data format from server');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRaces();
  }, [displayDate, refreshKey]);

  return { races, loading, error, handleManualRefresh, lastRefreshTime };
};