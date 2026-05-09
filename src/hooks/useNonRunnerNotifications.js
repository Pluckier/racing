import { useState, useEffect, useRef } from 'react';

export function useNonRunnerNotifications(races, displayDate) {
  const [notifications, setNotifications] = useState([]);
  const prevRacesRef = useRef(races);
  const prevDateRef = useRef(displayDate?.getTime());

  useEffect(() => {
    const prevRaces = prevRacesRef.current;
    const prevDate = prevDateRef.current;
    const currentDate = displayDate?.getTime();

    // Update refs for next comparison
    prevRacesRef.current = races;
    prevDateRef.current = currentDate;

    // Skip notification on initial load or if the user switched the date
    if (!prevRaces || prevRaces.length === 0 || prevDate !== currentDate) {
      return;
    }

    const newNonRunners = [];
    races.forEach(currentRace => {
      const prevRace = prevRaces.find(r => r.time === currentRace.time && r.place === currentRace.place);
      if (!prevRace) return;

      currentRace.horses.forEach(currentHorse => {
        const prevHorse = prevRace.horses.find(h => h.name === currentHorse.name);
        if (!prevHorse) return;

        const wasRunner = prevHorse.odds?.length > 0 && prevHorse.odds[prevHorse.odds.length - 1] !== "null" && prevHorse.odds[prevHorse.odds.length - 1] !== "NR";
        const isNR = currentHorse.odds?.length > 0 && (currentHorse.odds[currentHorse.odds.length - 1] === "null" || currentHorse.odds[currentHorse.odds.length - 1] === "NR");

        if (wasRunner && isNR) {
          newNonRunners.push({
            id: `${currentHorse.name}-${currentRace.time}-${Date.now()}-${Math.random()}`,
            name: currentHorse.name,
            race: `${currentRace.time} ${currentRace.place}`
          });
        }
      });
    });

    // Inform one-by-one by staggering the state updates
    newNonRunners.forEach((nr, index) => {
      setTimeout(() => {
        setNotifications(prev => [...prev, nr]);
      }, index * 1200); // 1.2s delay between each notification
    });
  }, [races, displayDate]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return { notifications, removeNotification };
}