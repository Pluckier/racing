import { useMemo } from 'react';
import { augmentRaceWithStats } from '../utils/racingLogic';

export const useFilteredRaces = (races, filters, currentTime, displayDate) => {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dDate = new Date(displayDate);
    dDate.setHours(0, 0, 0, 0);

    const isToday = dDate.getTime() === today.getTime();
    const isFuture = dDate > today;

    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const pool = Array.isArray(races) ? races : [];

    return pool
      .map(augmentRaceWithStats)
      .filter(race => {
        if (!race?.time) return false;

        const matchesPlace = filters.places.length === 0 || filters.places.includes(race.place);
        const isHandicap = race.detail?.toLowerCase().includes('handicap');
        const hasMinRunners = (race.horses?.length || 0) >= 8;
        const matchesTricast = !filters.tricast || (isHandicap && hasMinRunners);

        const [rH, rM] = race.time.split(':').map(Number);
        const raceMinutes = rH * 60 + rM;
        const matchesFollow = !filters.follow || isFuture || !isToday || nowMinutes <= (raceMinutes + 3);
        return matchesPlace && matchesTricast && matchesFollow;
      });
  }, [races, filters, currentTime, displayDate]);
};