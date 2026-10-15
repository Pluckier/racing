import { useRef, useEffect } from 'react';

/**
 * Exposes a stable ref holding the latest value to avoid stale closures in effects and listeners
 * without mutating refs during render (fully compliant with React 19).
 */
export function useLatestRef(value) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export default useLatestRef;
