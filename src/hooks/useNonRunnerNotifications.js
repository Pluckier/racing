import { useState, useEffect, useRef } from 'react';

export function useNonRunnerNotifications(races, displayDate) {
  const [notifications, setNotifications] = useState([]);
  const [approvedNonRunners, setApprovedNonRunners] = useState(new Set());
  const [rejectedNonRunners, setRejectedNonRunners] = useState(new Set());

  const prevRacesRef = useRef(races);
  const prevDateRef = useRef(displayDate?.getTime());

  useEffect(() => {
    const prevRaces = prevRacesRef.current;
    const prevDate = prevDateRef.current;
    const currentDate = displayDate?.getTime();

    // Update refs for next comparison
    prevRacesRef.current = races;
    prevDateRef.current = currentDate;

    // On date change: clear all override state and pending notifications
    if (prevDate !== currentDate) {
      setNotifications([]);
      setApprovedNonRunners(new Set());
      setRejectedNonRunners(new Set());
      return;
    }

    // Skip notification on initial load
    if (!prevRaces || prevRaces.length === 0) {
      return;
    }

    const newNonRunners = [];
    races.forEach(currentRace => {
      const prevRace = prevRaces.find(r => r.time === currentRace.time && r.place === currentRace.place);
      if (!prevRace) return;

      currentRace.horses.forEach(currentHorse => {
        const prevHorse = prevRace.horses.find(h => h.name === currentHorse.name);
        if (!prevHorse) return;

        const wasRunner = prevHorse.odds?.length > 0
          && prevHorse.odds[prevHorse.odds.length - 1] !== "null"
          && prevHorse.odds[prevHorse.odds.length - 1] !== "NR";

        const isNR = currentHorse.odds?.length > 0
          && (currentHorse.odds[currentHorse.odds.length - 1] === "null"
            || currentHorse.odds[currentHorse.odds.length - 1] === "NR");

        if (wasRunner && isNR) {
          const horseKey = `${currentHorse.name}@${currentRace.time}${currentRace.place}`;

          // Never re-notify for horses the user has already decided on
          if (rejectedNonRunners.has(horseKey) || approvedNonRunners.has(horseKey)) return;

          newNonRunners.push({
            id: `${horseKey}-${Date.now()}-${Math.random()}`,
            horseKey,
            name: currentHorse.name,
            race: `${currentRace.time} ${currentRace.place}`
          });
        }
      });
    });

    // Stagger notifications 1.2s apart
    newNonRunners.forEach((nr, index) => {
      setTimeout(() => {
        setNotifications(prev => [...prev, nr]);
      }, index * 1200);
    });
  }, [races, displayDate]);

  const acceptNotification = (id) => {
    setNotifications(prev => {
      const item = prev.find(n => n.id === id);
      if (item) {
        setApprovedNonRunners(s => new Set([...s, item.horseKey]));
      }
      return prev.filter(n => n.id !== id);
    });
  };

  const rejectNotification = (id) => {
    setNotifications(prev => {
      const item = prev.find(n => n.id === id);
      if (item) {
        setRejectedNonRunners(s => new Set([...s, item.horseKey]));
      }
      return prev.filter(n => n.id !== id);
    });
  };

  const clearAll = () => {
    // Dismiss all pending — no decision, horse follows feed
    setNotifications([]);
  };

  return {
    notifications,
    approvedNonRunners,
    rejectedNonRunners,
    acceptNotification,
    rejectNotification,
    clearAll,
  };
}