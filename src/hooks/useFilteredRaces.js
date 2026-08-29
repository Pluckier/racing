import { useMemo } from 'react';
import { augmentRaceWithStats } from '../utils/racingLogic';
import { useStore } from '../store/alarmStore';

export const useFilteredRaces = (races, filters, currentTime, displayDate) => {
  const aiMode = useStore((state) => state.aiMode);
  const toggleAi = useStore((state) => state.toggleAi);
  const selectedTrainers = useStore((state) => state.selectedTrainers);
  const selectedJockeys = useStore((state) => state.selectedJockeys);

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
      .map(race => augmentRaceWithStats(race, aiMode, selectedTrainers, selectedJockeys))
      .filter(race => {
        if (!race?.time) return false;

        const matchesPlace = filters.places.length === 0 || filters.places.includes(race.place);
        const isHandicap = race.detail?.toLowerCase().includes('handicap') || race.detail?.toLowerCase().includes('nursery');
        const isClass1 = race.detail?.toLowerCase().includes('class 1') || race.detail?.toLowerCase().includes('class 2');
        const hasMinRunners = (race.horses?.length || 0) >= 8;
        const matchesTricast = !filters.tricast || ((isHandicap || isClass1) && hasMinRunners);

        const [rH, rM] = race.time.split(':').map(Number);
        const raceMinutes = rH * 60 + rM;
        const matchesFollow = !filters.follow || isFuture || !isToday || nowMinutes <= (raceMinutes + 3);
        return matchesPlace && matchesTricast && matchesFollow;
      });
  }, [races, filters, currentTime, displayDate, aiMode, selectedTrainers, selectedJockeys]);
};