import { useRef, useEffect, useCallback } from 'react';

// Shared fallback cache for the selected UK male voice across the module
let cachedMaleVoice = null;

/**
 * Searches for and caches the Google UK English Male voice or a British male alternative.
 */
function getMaleUKVoice() {
  if (cachedMaleVoice) return cachedMaleVoice;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Tiered fallback strategy targeting British MALE voices
  const voice =
    // Option A: Your exact preferred Google UK Male voice
    voices.find(v => v.name === 'Google UK English Male') ||
    // Option B: Standard Microsoft Windows Male UK voice (George)
    voices.find(v => v.name === 'Microsoft George - English (United Kingdom)') ||
    // Option C: Any UK voice containing the keyword "male" (case-insensitive)
    voices.find(v =>
      (v.lang === 'en-GB' || v.lang.startsWith('en-GB')) &&
      v.name.toLowerCase().includes('male')
    ) ||
    // Option D: System default UK voice if no explicit male voice is found
    voices.find(v => v.lang === 'en-GB' || v.lang.startsWith('en-GB'));

  if (voice) {
    cachedMaleVoice = voice;
  }
  return voice;
}

/**
 * Speaks the race post time and venue using Web Speech API with British male voice fallbacks.
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

    // Tell the engine to prefer British English rules if the specific voice fails
    utterance.lang = 'en-GB';

    const selectedVoice = getMaleUKVoice();
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

  // Initialise/update speech synthesis voices as soon as they become ready in the browser
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Trigger voice discovery immediately
    getMaleUKVoice();

    // Re-evaluate when Chrome/Firefox signals that voices have populated
    window.speechSynthesis.onvoiceschanged = () => {
      getMaleUKVoice();
    };

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

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
