import { useEffect, useCallback } from 'react';
import { useStore } from '../store/store.js';
import { useAudioAlarms } from './useAudioAlarms.js';

/**
 * Generates the standardized alarm ID from a race object (e.g. "14:30Ascot").
 *
 * @param {Object} race
 * @returns {string}
 */
export function getRaceAlarmId(race) {
  if (!race || !race.time || !race.place) return '';
  return `${race.time}${race.place.replace(/\s+/g, '')}`;
}

/**
 * Evaluates whether a race alarm should trigger or has expired relative to current time.
 * Triggers 4 minutes before race post time.
 *
 * @param {Object} race
 * @param {Date} now
 * @returns {'TRIGGER'|'EXPIRED'|'WAIT'|'NONE'}
 */
export function checkRaceAlarmStatus(race, now = new Date()) {
  if (!race || !race.time) return 'NONE';
  const [hours, minutes] = race.time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 'NONE';

  const raceDate = new Date(now);
  raceDate.setHours(hours, minutes, 0, 0);

  const triggerTime = raceDate.getTime() - 240000; // 4 minutes before post time

  if (now.getTime() >= triggerTime && now.getTime() < raceDate.getTime()) {
    return 'TRIGGER';
  } else if (now.getTime() >= raceDate.getTime()) {
    return 'EXPIRED';
  }
  return 'WAIT';
}

/**
 * Hook to manage race alarms via Zustand store and check upcoming races on an interval.
 *
 * @param {Array} races - Current race list from state
 * @param {Object} [options]
 * @param {Function} [options.onTriggerAlarm] - Optional custom alarm trigger callback
 */
export function useAlarms(races = [], options = {}) {
  const enabledAlarms = useStore((state) => state.alarms);
  const addAlarm = useStore((state) => state.addAlarm);
  const removeAlarm = useStore((state) => state.removeAlarm);
  const { triggerRaceAlarm: defaultTrigger } = useAudioAlarms();

  const triggerAlarm = options.onTriggerAlarm || defaultTrigger;

  const toggleAlarm = useCallback((raceId) => {
    if (!raceId) return;
    if (enabledAlarms.includes(raceId)) {
      removeAlarm(raceId);
    } else {
      addAlarm(raceId);
    }
  }, [enabledAlarms, addAlarm, removeAlarm]);

  const isAlarmEnabled = useCallback((raceId) => {
    return Array.isArray(enabledAlarms) && enabledAlarms.includes(raceId);
  }, [enabledAlarms]);

  // Global timer to check for upcoming races with enabled alarms
  useEffect(() => {
    if (!Array.isArray(enabledAlarms) || enabledAlarms.length === 0) return;
    if (!Array.isArray(races) || races.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();

      races.forEach((race) => {
        const id = getRaceAlarmId(race);
        if (!id || !enabledAlarms.includes(id)) return;

        const status = checkRaceAlarmStatus(race, now);
        if (status === 'TRIGGER') {
          triggerAlarm(race);
          removeAlarm(id);
        } else if (status === 'EXPIRED') {
          removeAlarm(id);
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [enabledAlarms, races, removeAlarm, triggerAlarm]);

  return {
    enabledAlarms,
    toggleAlarm,
    addAlarm,
    removeAlarm,
    isAlarmEnabled
  };
}

export default useAlarms;
