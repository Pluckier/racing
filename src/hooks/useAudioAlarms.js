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
    voices.find(v => (v.lang === 'en-GB' || v.lang.startsWith('en-GB')) && v.name.toLowerCase().includes('male')) ||
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
let activeUtterance = null;

export function speakRace(time, place) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Web Speech API (speechSynthesis) is not supported in this browser.');
    return;
  }

  try {
    window.speechSynthesis.cancel();

    // 1. Assign to the module-level variable so it escapes local garbage collection
    activeUtterance = new SpeechSynthesisUtterance(`Post time, ${time}, at, ${place}`);

    activeUtterance.lang = 'en-GB';
    const selectedVoice = getMaleUKVoice();
    if (selectedVoice) {
      activeUtterance.voice = selectedVoice;
    }

    // 2. Clear the reference only AFTER it safely finishes or errors out
    activeUtterance.onend = () => { activeUtterance = null; };
    activeUtterance.onerror = () => { activeUtterance = null; };

    window.speechSynthesis.speak(activeUtterance);
  } catch (err) {
    console.error('Speech synthesis failed:', err);
    activeUtterance = null;
  }
}

/**
 * Hook encapsulating audio and speech synthesis alarm triggers, retry handling, and cleanup.
 */
export function useAudioAlarms() {
  const timeoutsRef = useRef([]);

  // Initialise/update speech synthesis voices safely using event listeners
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Trigger voice discovery immediately
    getMaleUKVoice();

    const handleVoicesChanged = () => {
      getMaleUKVoice();
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, []);

  const safePlayAudio = useCallback((src, retries = 3, delay = 1000, onEnded = null) => {
    function attemptPlay(currentSrc, remainingRetries, currentDelay) {
      if (typeof Audio === 'undefined') {
        if (onEnded) onEnded();
        return null;
      }

      const audio = new Audio(currentSrc);

      // Track cleanups to avoid memory leaks on element error/retries
      const cleanup = () => {
        audio.removeEventListener('ended', handleEnded);
        audio.src = '';
        audio.load();
      };

      const handleEnded = () => {
        cleanup();
        if (onEnded) onEnded();
      };

      audio.addEventListener('ended', handleEnded, { once: true });

      audio.play().catch((error) => {
        cleanup(); // Wipe out the failed element immediately

        if (remainingRetries > 0) {
          console.warn(`Audio playback failed. Retrying in ${currentDelay}ms... (${remainingRetries} retries left)`, error);

          const timerId = setTimeout(() => {
            const freshSrc = `${src}?t=${Date.now()}`;
            // FIXED: onEnded is now tunneled into the recursive cycle properly
            attemptPlay(freshSrc, remainingRetries - 1, currentDelay * 1.5);
          }, currentDelay);

          timeoutsRef.current.push(timerId);
        } else {
          console.error(`Audio failed to play after multiple attempts for source: ${src}`);
          if (onEnded) onEnded();
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

  // Handle active timeouts and speech speech synthesis cuts on component unmount
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

  return { playAudioWithRetry: safePlayAudio, speakRace, triggerRaceAlarm };
}

export default useAudioAlarms;
