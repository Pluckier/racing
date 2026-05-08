import { useState, useEffect, useRef } from 'react';

export function useNextRaceBanner(filteredRacesCount, currentTime, isFollowMode, displayDate) {
  const [showBanner, setShowBanner] = useState(false);
  const prevCountRef = useRef(filteredRacesCount);
  const prevTimeRef = useRef(currentTime);
  const prevDateRef = useRef(displayDate?.getTime());

  useEffect(() => {
    const prevCount = prevCountRef.current;
    const prevTime = prevTimeRef.current;
    const prevDate = prevDateRef.current;
    
    prevCountRef.current = filteredRacesCount;
    prevTimeRef.current = currentTime;
    prevDateRef.current = displayDate?.getTime();

    // If the user has switched the display date, we are loading new data.
    // We should not trigger the "Race finished" banner in this case.
    if (displayDate?.getTime() !== prevDate) return;

    // Trigger banner if in Follow mode and a race just disappeared from the list due to a time update
    if (isFollowMode && currentTime.getTime() !== prevTime.getTime() && filteredRacesCount < prevCount && prevCount > 0) {
      setShowBanner(true);
      const timer = setTimeout(() => setShowBanner(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [filteredRacesCount, currentTime, isFollowMode, displayDate]);

  return showBanner;
}
