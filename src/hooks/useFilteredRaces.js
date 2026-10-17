import { useMemo } from 'react';
import { augmentRaceWithStats, isNiceRace } from '../utils/racingLogic';
import { useStore } from '../store/store';

export const useFilteredRaces = (races, filters) => {
  const aiMode = useStore((state) => state.aiMode);
  const selectedTrainers = useStore((state) => state.selectedTrainers);
  const selectedJockeys = useStore((state) => state.selectedJockeys);
  const selectedOwners = useStore((state) => state.selectedOwners);
  const selectedFoaled = useStore((state) => state.selectedFoaled);
  const bloodlineMode = useStore((state) => state.bloodlineMode);
  const selectedDams = useStore((state) => state.selectedDams);
  const selectedBroodmareSires = useStore((state) => state.selectedBroodmareSires);
  const selectedSires = useStore((state) => state.selectedSires);

  return useMemo(() => {
    const pool = Array.isArray(races) ? races : [];

    return pool
      .map(race => augmentRaceWithStats(race, aiMode, selectedTrainers, selectedJockeys, selectedOwners, selectedFoaled, bloodlineMode, selectedDams, selectedBroodmareSires, selectedSires))
      .filter(race => {
        if (!race?.time) return false;

        const matchesPlace = filters.places.length === 0 || filters.places.includes(race.place);
        const matchesTricast = !filters.tricast || isNiceRace(race);

        return matchesPlace && matchesTricast;
      });
  }, [races, filters.places, filters.tricast, aiMode, selectedTrainers, selectedJockeys, selectedOwners, selectedFoaled, bloodlineMode, selectedDams, selectedBroodmareSires, selectedSires]);
};