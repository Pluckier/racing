import { useState, useEffect } from 'react';

/**
 * Manages the countdown timer (in minutes) for the Auto-Refresh UI.
 * Decrements every 60 seconds and resets whenever race data refreshes.
 *
 * @param {Array} races - Current races array
 * @param {number} initialMinutes - Initial countdown duration in minutes (default 15)
 * @returns {number} refreshMinutes
 */
export function useCountdown(races, initialMinutes = 15) {
  const [prevRaces, setPrevRaces] = useState(races);
  const [refreshMinutes, setRefreshMinutes] = useState(initialMinutes);

  // Reset the countdown whenever race data is refreshed/updated (React recommended pattern)
  if (races !== prevRaces) {
    setPrevRaces(races);
    setRefreshMinutes(initialMinutes);
  }

  // Countdown timer: updates every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshMinutes(prev => (prev > 1 ? prev - 1 : initialMinutes));
    }, 60000);
    return () => clearInterval(timer);
  }, [initialMinutes]);

  return refreshMinutes;
}

export default useCountdown;
