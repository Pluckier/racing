import { useState, useEffect, useCallback } from 'react';
import { useLatestRef } from './useLatestRef.js';

/**
 * Parses a window.location.hash string into date and raceId parts.
 * e.g. "2026-10-15@14:30Ascot" -> { datePart: "2026-10-15", raceId: "14:30Ascot" }
 *
 * @param {string} hash
 * @returns {{ datePart: string|null, raceId: string }}
 */
export function parseRaceHash(hash) {
  if (!hash) return { datePart: null, raceId: '' };
  const raw = hash.startsWith('#') ? hash.substring(1) : hash;
  const decoded = decodeURIComponent(raw);
  if (decoded.includes('@')) {
    const [datePart, raceId] = decoded.split('@');
    return { datePart: datePart || null, raceId: raceId || '' };
  }
  return { datePart: null, raceId: decoded };
}

/**
 * Finds the index of the next upcoming race based on current time (hours/minutes),
 * or 0 if none found.
 *
 * @param {Array} races
 * @param {Date} [now]
 * @returns {number}
 */
export function findUpcomingRaceIndex(races, now = new Date()) {
  if (!Array.isArray(races) || races.length === 0) return 0;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const upcomingIdx = races.findIndex(r => {
    if (!r || !r.time) return false;
    const [hours, minutes] = r.time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return false;
    return (hours * 60 + minutes) >= currentMinutes;
  });
  return upcomingIdx !== -1 ? upcomingIdx : 0;
}

/**
 * Custom hook to synchronize the active race index with window.location.hash.
 * Handles the 'hashchange' window listener, initial and update sync,
 * race number jumping, and smooth scrolling in grid view mode.
 *
 * @param {Object} params
 * @param {Array} params.filteredRaces - List of filtered races
 * @param {boolean} params.loading - Current loading state
 * @param {string} params.currentDateStr - Formatted current date string ("YYYY-MM-DD")
 * @param {Function} params.setDisplayDate - Date setter from state
 * @param {string} params.viewMode - 'single' or 'all'
 * @returns {{
 *   activeRaceIndex: number,
 *   setActiveRaceIndex: Function,
 *   raceNumberInput: string,
 *   setRaceNumberInput: Function,
 *   jumpToRaceNumber: Function
 * }}
 */
export function useHashSync({
  filteredRaces = [],
  loading = false,
  currentDateStr = '',
  setDisplayDate = () => {},
  viewMode = 'single'
}) {
  const [activeRaceIndex, setActiveRaceIndex] = useState(0);
  const [raceNumberInput, setRaceNumberInput] = useState('1');

  // Stable latest refs to prevent stale closures in event listeners
  const filteredRacesRef = useLatestRef(filteredRaces);
  const currentDateStrRef = useLatestRef(currentDateStr);
  const setDisplayDateRef = useLatestRef(setDisplayDate);
  const viewModeRef = useLatestRef(viewMode);
  const loadingRef = useLatestRef(loading);

  // Keep raceNumberInput in sync with activeRaceIndex
  useEffect(() => {
    setRaceNumberInput(String(activeRaceIndex + 1));
  }, [activeRaceIndex]);

  // Jump to specific race number (1-based index)
  const jumpToRaceNumber = useCallback((value) => {
    const num = parseInt(value, 10);
    const races = filteredRacesRef.current || [];
    if (isNaN(num) || num < 1 || num > races.length) {
      setRaceNumberInput(String(activeRaceIndex + 1));
      return;
    }
    const race = races[num - 1];
    window.location.hash = `${currentDateStrRef.current}@${race.time}${race.place.replace(/\s+/g, '')}`;
  }, [activeRaceIndex, filteredRacesRef, currentDateStrRef]);

  // Listen for hash changes (e.g. user navigation, timeline clicks, Prev/Next)
  useEffect(() => {
    const handleHashSync = () => {
      if (loadingRef.current) return;

      const { datePart, raceId } = parseRaceHash(window.location.hash);
      const races = filteredRacesRef.current || [];
      if (races.length === 0) return;

      if (datePart && datePart !== currentDateStrRef.current) {
        const [y, m, d] = datePart.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          setDisplayDateRef.current(new Date(y, m - 1, d));
          return;
        }
      }

      const index = races.findIndex(r =>
        `${r.time}${r.place.replace(/\s+/g, '')}` === raceId
      );

      if (index !== -1) {
        setActiveRaceIndex(index);
      }

      if (viewModeRef.current === 'all') {
        setTimeout(() => {
          const el = document.getElementById(raceId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, [loadingRef, filteredRacesRef, currentDateStrRef, setDisplayDateRef, viewModeRef]);

  // Sync active race index and hash whenever filteredRaces or currentDateStr updates
  useEffect(() => {
    if (loading || filteredRaces.length === 0) return;

    const { raceId } = parseRaceHash(window.location.hash);

    const foundIndex = filteredRaces.findIndex(r =>
      `${r.time}${r.place.replace(/\s+/g, '')}` === raceId
    );

    if (foundIndex !== -1) {
      setActiveRaceIndex(foundIndex);
    } else {
      // If current hash is not in filtered races (e.g. venue filter selected, or initial load),
      // choose the upcoming race (if today) or the first available race
      let selectedIndex = 0;

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (currentDateStr === todayStr) {
        selectedIndex = findUpcomingRaceIndex(filteredRaces, now);
      }

      const selectedRace = filteredRaces[selectedIndex] || filteredRaces[0];
      setActiveRaceIndex(selectedIndex);
      const targetId = `${selectedRace.time}${selectedRace.place.replace(/\s+/g, '')}`;
      window.location.hash = `${currentDateStr}@${targetId}`;
    }
  }, [filteredRaces, currentDateStr, loading]);

  return {
    activeRaceIndex,
    setActiveRaceIndex,
    raceNumberInput,
    setRaceNumberInput,
    jumpToRaceNumber
  };
}

export default useHashSync;
