import { useState, useEffect, useCallback, useRef } from 'react';

export function useRaces(displayDate) {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  // 1. Standardise the date parameter into a clean, stable string primitive
  const dateKey = displayDate instanceof Date
    ? displayDate.toLocaleDateString('en-GB').replace(/\//g, '-') // Result: "09-09-2026"
    : String(displayDate);

  const lastDateRef = useRef(null);

  const handleManualRefresh = useCallback(async () => {
    if (!dateKey) return;

    setLoading(true);
    setError(null);

    try {
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
        setRaces(data);
        setLastRefreshTime(Date.now());
      } catch (err) {
        console.error("Fetch failure:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } catch (outerError) {
      console.error("Outer logical failure:", outerError);
      setLoading(false);
    }
  }, [dateKey, displayDate]); // Corrected: Comma separates function and dependency array


  // 3. Effect A: Initial data fetch on mount or when the date changes
  useEffect(() => {
    handleManualRefresh();
  }, [handleManualRefresh]);

  // 4. Effect B: Handles the background 15-minute auto-fetch loop safely
  useEffect(() => {
    const AUTO_REFRESH_MS = 15 * 60 * 1000; // 15 Minutes

    const interval = setInterval(() => {
      handleManualRefresh();
    }, AUTO_REFRESH_MS);

    // Clean up the timer context if the component unmounts or the date changes
    return () => clearInterval(interval);
  }, [handleManualRefresh]);

  return { races, loading, error, handleManualRefresh, lastRefreshTime };
}
