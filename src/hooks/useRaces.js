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

      let data = null;

      const MS = 15 * 60 * 1000;
      const delayToken = Math.floor(Date.now() / MS);
      const cacheBuster = `?v=${delayToken}`;

      // STRATEGY A: Attempt the compressed .json.gz file first
      try {
        const response = await fetch(`https://pluckier-cdn.tonykennah.workers.dev/${dateString}-races.json.gz${cacheBuster}`, { cache: 'no-store' });

        if (!response.ok) {
          // This manually jumps directly down to the catch block
          throw new Error(`Races for ${dateString} are not available yet in the storage bucket (HTTP ${response.status}).`);
        }

        // 2. Clear out manual decompression streams! The browser unzips this automatically 
        // due to your 'Content-Encoding: gzip' metadata header rules.
        data = await response.json();
        console.log('Successfully loaded the auto-decompressed data');
      } catch (error) {
        // STRATEGY B: Fallback to the uncompressed .json file if Gzip fails
        console.warn('Fetch failed, trying uncompressed JSON fallback...', error);

        const fallbackResponse = await fetch(`https://pluckier.co.uk/${dateString}-races.json`, { cache: 'no-store' });
        if (!fallbackResponse.ok) throw new Error('Races for this date are not available in any format');

        data = await fallbackResponse.json();
        console.log('Successfully loaded uncompressed fallback data');
      }

      // If either strategy successfully populated the data variable, update state
      setRaces(data);
      setLastRefreshTime(Date.now());

    } catch (err) {
      console.error("Fetch pipeline failure:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateKey, displayDate]);


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
