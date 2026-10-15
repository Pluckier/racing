import { useRef, useEffect, useCallback } from 'react';

/**
 * Speaks the race post time and venue using Web Speech API with American voice fallbacks.
 *
 * @param {string} time - Race post time (e.g. "14:30")
 * @param {string} place - Racecourse venue (e.g. "Ascot")
 */
export function speakRace(time, place) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Web Speech API (speechSynthesis) is not supported in this browser.');
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`Post time, ${time}, at, ${place}`);

    // Explicitly tell the engine to use US English if specific voice fails
    utterance.lang = 'en-US';

    // Fetch the loaded system voices
    const voices = window.speechSynthesis.getVoices();

    // Option A: Target a specific high-quality voice directly by name
    let selectedVoice = voices.find(voice => voice.name === 'Google US English');

    // Option B: Fallback to a native Microsoft US voice if Google isn't available
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => voice.name === 'Microsoft Zira - English (United States)');
    }

    // Option C: Generic fallback for any available US English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => voice.lang === 'en-US' || voice.lang.startsWith('en-US'));
    }

    // Apply the voice if we found an American one
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Speech synthesis failed:', err);
  }
}

/**
 * Plays audio with automatic retry logic on failure.
 *
 * @param {string} src - Audio source URL
 * @param {number} retries - Number of retry attempts left
 * @param {number} delay - Delay in ms before next retry
 * @param {Function|null} onEnded - Callback executed when audio completes or retries exhaust
 * @returns {HTMLAudioElement|null}
 */
export function playAudioWithRetry(src, retries = 3, delay = 1000, onEnded = null) {
  if (typeof Audio === 'undefined') {
    if (onEnded) onEnded();
    return null;
  }

  const audio = new Audio(src);

  if (onEnded) {
    audio.addEventListener('ended', onEnded, { once: true });
  }

  audio.play().catch((error) => {
    if (retries > 0) {
      console.warn(`Audio playback failed. Retrying in ${delay}ms... (${retries} retries left)`, error);

      setTimeout(() => {
        // Appending a timestamp forces the browser to bypass any broken connections or bad cache
        const freshSrc = `${src}?t=${Date.now()}`;
        playAudioWithRetry(freshSrc, retries - 1, delay * 1.5, onEnded);
      }, delay);
    } else {
      console.error(`Audio failed to play after multiple attempts for source: ${src}`);
      if (onEnded) {
        onEnded();
      }
    }
  });

  return audio;
}

/**
 * Hook encapsulating audio and speech synthesis alarm triggers, retry handling, and cleanup.
 */
export function useAudioAlarms() {
  const timeoutsRef = useRef([]);

  const safePlayAudio = useCallback((src, retries = 3, delay = 1000, onEnded = null) => {
    function attemptPlay(currentSrc, remainingRetries, currentDelay) {
      if (typeof Audio === 'undefined') {
        if (onEnded) onEnded();
        return null;
      }

      const audio = new Audio(currentSrc);

      if (onEnded) {
        audio.addEventListener('ended', onEnded, { once: true });
      }

      audio.play().catch((error) => {
        if (remainingRetries > 0) {
          console.warn(`Audio playback failed. Retrying in ${currentDelay}ms... (${remainingRetries} retries left)`, error);

          const timerId = setTimeout(() => {
            const freshSrc = `${src}?t=${Date.now()}`;
            attemptPlay(freshSrc, remainingRetries - 1, currentDelay * 1.5);
          }, currentDelay);
          timeoutsRef.current.push(timerId);
        } else {
          console.error(`Audio failed to play after multiple attempts for source: ${src}`);
          if (onEnded) {
            onEnded();
          }
        }
      });

      return audio;
    }

    return attemptPlay(src, retries, delay);
  }, []);

  const triggerRaceAlarm = useCallback((race) => {
    if (!race || !race.time || !race.place) return;

    safePlayAudio('music.mp3', 3, 1000, () => {
      speakRace(race.time, race.place);
    });
  }, [safePlayAudio]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(id => clearTimeout(id));
      timeoutsRef.current = [];
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore unmount error
        }
      }
    };
  }, []);

  return {
    playAudioWithRetry: safePlayAudio,
    speakRace,
    triggerRaceAlarm
  };
}

export default useAudioAlarms;
