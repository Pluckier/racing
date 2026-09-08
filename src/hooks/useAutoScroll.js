import { useEffect, useRef } from 'react';

export function useAutoScroll(loading, filteredRaces) {
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (!loading && filteredRaces.length > 0 && !hasScrolled.current) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const nextRace = filteredRaces.find(r => r.time >= timeStr);

      if (nextRace) {
        setTimeout(() => {
          const hash = window.location.hash.substring(1);
          const hashedElement = hash ? document.getElementById(hash) : null;

          if (hashedElement) {
            hashedElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            hasScrolled.current = true;
          } else {
            // REMOVED: Time difference calculation and 10-minute validation block

            // Directly target the next available race
            const id = `${nextRace.time}${nextRace.place.replace(/\s+/g, '')}`;
            const element = document.getElementById(id);

            if (element) {
              element.scrollIntoView({ behavior: 'auto', block: 'start' });
              hasScrolled.current = true;
            }
          }
        }, 600);
      }
    }
  }, [loading, filteredRaces]);

  return hasScrolled;
}
