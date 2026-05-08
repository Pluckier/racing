import { useState, useEffect, useCallback } from 'react';

export const useRaces = (displayDate) => {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshCooldown, setRefreshCooldown] = useState(false);

  const fetchRaces = useCallback(
    (showSkeleton = true) => {
      if (showSkeleton) setLoading(true);
      setError(null);
      const day = String(displayDate.getDate()).padStart(2, '0');
      const month = String(displayDate.getMonth() + 1).padStart(2, '0');
      const year = displayDate.getFullYear();
      const dateString = `${day}-${month}-${year}`;

      fetch(`https://www.pluckier.co.uk/${dateString}-races.json`, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error('Races for this date are not available');
          return response.json();
        })
        .then((data) => {
          if (Array.isArray(data)) setRaces(data);
          else throw new Error('Unexpected data format from server');
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [displayDate]
  );

  useEffect(() => {
    fetchRaces(true);
  }, [fetchRaces]);

  const handleManualRefresh = useCallback(() => {
    if (refreshCooldown) return;

    fetchRaces(false);
    setRefreshCooldown(true);
    // Re-enable the button after 600 seconds
    setTimeout(() => setRefreshCooldown(false), 600000);
  }, [refreshCooldown, fetchRaces]);

  return { races, loading, error, refreshCooldown, handleManualRefresh };
};