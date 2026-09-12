import { useState, useEffect, useRef } from 'react';

export function useNonRunnerNotifications(races, displayDate) {
  const [notifications, setNotifications] = useState([]);
  const [pendingNonRunners, setPendingNonRunners] = useState(new Set());
  const [approvedNonRunners, setApprovedNonRunners] = useState(new Set());
  const [rejectedNonRunners, setRejectedNonRunners] = useState(new Set());

  const prevRacesRef = useRef(races);
  const prevDateRef = useRef(displayDate?.getTime());

  const approvedRef = useRef(approvedNonRunners);
  approvedRef.current = approvedNonRunners;
  const rejectedRef = useRef(rejectedNonRunners);
  rejectedRef.current = rejectedNonRunners;
  const pendingRef = useRef(pendingNonRunners);
  pendingRef.current = pendingNonRunners;

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
      setPendingNonRunners(new Set());
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

          // Never re-notify for horses the user has already decided on or is currently pending
          if (rejectedRef.current.has(horseKey) || approvedRef.current.has(horseKey) || pendingRef.current.has(horseKey)) return;

          newNonRunners.push({
            id: `${horseKey}-${Date.now()}-${Math.random()}`,
            horseKey,
            name: currentHorse.name,
            race: `${currentRace.time} ${currentRace.place}`
          });
        }
      });
    });

    if (newNonRunners.length > 0) {
      // Mark as pending immediately so the horse is not treated as a non-runner before user decision
      setPendingNonRunners(prev => {
        const next = new Set(prev);
        newNonRunners.forEach(nr => next.add(nr.horseKey));
        return next;
      });
    }

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
        setPendingNonRunners(s => {
          const next = new Set(s);
          next.delete(item.horseKey);
          return next;
        });
      }
      return prev.filter(n => n.id !== id);
    });
  };

  const rejectNotification = (id) => {
    setNotifications(prev => {
      const item = prev.find(n => n.id === id);
      if (item) {
        setRejectedNonRunners(s => new Set([...s, item.horseKey]));
        setPendingNonRunners(s => {
          const next = new Set(s);
          next.delete(item.horseKey);
          return next;
        });
      }
      return prev.filter(n => n.id !== id);
    });
  };

  const clearAll = () => {
    // "Accept All": Approve all pending non-runner alerts
    setNotifications(prev => {
      const allKeys = prev.map(n => n.horseKey);
      setApprovedNonRunners(s => {
        const next = new Set(s);
        allKeys.forEach(k => next.add(k));
        pendingRef.current.forEach(k => next.add(k));
        return next;
      });
      setPendingNonRunners(new Set());
      return [];
    });
  };

  return {
    notifications,
    pendingNonRunners,
    approvedNonRunners,
    rejectedNonRunners,
    acceptNotification,
    rejectNotification,
    clearAll,
  };
}