import React, { useState, useMemo } from 'react';
import HorseRow from './HorseRow';
import FormChart from '../charts/FormChart';
import OddsChart from '../charts/OddsChart';
import Modal from '../common/Modal';
import '../../css/RaceCard.css';
import { useStore } from '../../store/store';
import ThreeSliders from '../charts/Sliders';
import { getFormEmoji } from '../../constants/chartConstants';
import { HOT_TRAINERS } from '../../utils/racingLogic';

const SORT_MODES = ['odds', 'last', 'avg', 'all', 'high'];
const SORT_LABELS = {
  odds: 'Odds',
  avg: 'Avg3',
  last: '1Run',
  high: 'High',
  all: '\u00A0\u00A0All\u00A0\u00A0'
};

const RaceCard = ({ race, allRaces = [], highlightFiddles, highlightValues, highlightSelects, isAlarmEnabled, onToggleAlarm, viewMode, currentDateStr, pendingNonRunners = new Set(), approvedNonRunners = new Set(), rejectedNonRunners = new Set() }) => {
  const [showChart, setShowChart] = useState(false);
  const [showOdds, setShowOdds] = useState(false);
  const [sortBy, setSortBy] = useState('avg');
  const [activeChartRace, setActiveChartRace] = useState(race);

  const raceId = `${race.time}${race.place.replace(/\s+/g, '')}`;
  const raceKey = currentDateStr ? `${currentDateStr}_${raceId}` : raceId;

  const aiMode = useStore((store) => store.aiMode);
  const toggleAi = useStore((store) => store.toggleAi);
  const wValue = useStore((store) => store.raceSliders?.[raceKey]?.w ?? 0);
  const dValue = useStore((store) => store.raceSliders?.[raceKey]?.d ?? 0);
  const gValue = useStore((store) => store.raceSliders?.[raceKey]?.g ?? 0);
  const setRaceSlider = useStore((store) => store.setRaceSlider);

  const selectedTrainers = useStore((store) => store.selectedTrainers);

  const setW = (v) => setRaceSlider(raceKey, 'w', v);
  const setD = (v) => setRaceSlider(raceKey, 'd', v);
  const setG = (v) => setRaceSlider(raceKey, 'g', v);

  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Math.min(horse.past?.length || 0, 6) caps each individual horse at 6
  const totalPastRuns = race.horses?.reduce((acc, horse) => acc + Math.min(horse.past?.length || 0, 6), 0) || 0;
  const maxPossibleRuns = (race.horses?.length || 0) * 6;

  // 1. Calculate percentage as a number
  const formPercentage = maxPossibleRuns > 0
    ? Math.round((totalPastRuns / maxPossibleRuns) * 100)
    : 0;

  // 2. Determine which emoji to use based on the tier
  const emoji = getFormEmoji(formPercentage);

  // 3. Create final output string
  const finalDisplay = `${formPercentage}%${emoji}`;


  const getRating = (run) => {
    if (!run) return 0;
    const targetProperty = aiMode === 2 ? run.name2AI : aiMode === 1 ? run.nameAI : run.name;
    return Number(targetProperty) || 0;
  };

  const parseDistanceToFurlongs = (distStr) => {
    if (!distStr || typeof distStr !== 'string') return 0;
    let total = 0;
    const mMatch = distStr.match(/(\d+)m/);
    const fMatch = distStr.match(/(\d+)f/);
    const yMatch = distStr.match(/(\d+)y/);
    if (mMatch) total += parseInt(mMatch[1], 10) * 8;
    if (fMatch) total += parseInt(fMatch[1], 10);
    if (yMatch) total += Math.round(parseInt(yMatch[1], 10) / 220);
    return total;
  };

  const parseWeightToLbs = (wStr) => {
    if (!wStr) return 0;
    if (typeof wStr === 'number') return wStr;
    const parts = wStr.toString().split('-');
    if (parts.length === 2) return (parseInt(parts[0], 10) * 14) + parseInt(parts[1], 10);
    return parseInt(wStr, 10) || 0;
  };

  // Applies the same W/D/G bonus formula as FormChart and HorseRow
  const getAdjustedRating = (horse, run) => {
    const baseRating = getRating(run);
    if (!baseRating) return 0;
    let totalBonus = 0;

    // W — Weight turnaround
    const todayWeightLbs = parseWeightToLbs(horse?.weight);
    const pastWeightLbs = parseWeightToLbs(run?.weight);
    if (pastWeightLbs > 0 && todayWeightLbs > 0) {
      const weightDiff = Math.abs(pastWeightLbs - todayWeightLbs);
      const weightFactor = Math.pow(wValue / 100, 4);
      if (todayWeightLbs < pastWeightLbs) {
        totalBonus += baseRating * (weightFactor * 0.30) * weightDiff;
      } else if (todayWeightLbs > pastWeightLbs) {
        totalBonus -= baseRating * (weightFactor * 0.01) * weightDiff;
      }
    }

    // D — Distance match (within 20% tolerance)
    const todayFurlongs = parseDistanceToFurlongs(race.distance);
    const raceFurlongs = parseDistanceToFurlongs(run?.distance);
    if (todayFurlongs > 0 && raceFurlongs > 0) {
      if (Math.abs(todayFurlongs - raceFurlongs) <= todayFurlongs * 0.20) {
        totalBonus += baseRating * dValue;
      }
    }

    // G — Going match
    const cleanPastGoing = (run?.going || '').trim().toLowerCase();
    const cleanTodayGoing = (race.going || '').trim().toLowerCase();
    if (cleanPastGoing && cleanTodayGoing) {
      if (cleanPastGoing === cleanTodayGoing) {
        totalBonus += baseRating * gValue;
      } else if (cleanPastGoing.includes(cleanTodayGoing) || cleanTodayGoing.includes(cleanPastGoing)) {
        totalBonus += baseRating * (gValue / 2);
      } else {
        totalBonus -= baseRating * gValue * 0.2;
      }
    }

    return baseRating + totalBonus;
  };

  const getAvg = (h) => {
    const past = h.past || [];
    const last3 = past.slice(0, 3);
    if (last3.length === 0) return 0;
    return last3.reduce((acc, r) => acc + getAdjustedRating(h, r), 0) / last3.length;
  };

  const getMax = (h) => {
    const past = h.past || [];
    if (past.length === 0) return 0;
    return Math.max(...past.map(r => getAdjustedRating(h, r)));
  };

  const getLast = (h) => {
    const past = h.past || [];
    return past.length > 0 ? (getAdjustedRating(h, past[0]) || 0) : 0;
  };

  const getAllAvg = (h) => {
    const past = h.past || [];
    if (past.length === 0) return 0;
    return past.reduce((acc, r) => acc + getAdjustedRating(h, r), 0) / past.length;
  };

  const isHorseNR = (h) => {
    const horseKey = `${h.name}@${race.time}${race.place}`;
    if (rejectedNonRunners.has(horseKey)) return false;
    if (approvedNonRunners.has(horseKey)) return true;
    if (pendingNonRunners.has(horseKey)) return false;
    const odds = h.odds || [];
    const last = odds[odds.length - 1];
    return last === "null" || last === "NR";
  };

  const getLatestOdds = (h) => {
    if (isHorseNR(h)) return Infinity;
    const odds = h.odds || [];
    const last = odds[odds.length - 1];
    if (last && last !== "null" && last !== "NR" && !isNaN(last)) {
      return parseFloat(last);
    }
    const prevValid = [...odds].reverse().find(o => o && o !== "null" && o !== "NR" && !isNaN(o));
    return prevValid ? parseFloat(prevValid) : Infinity;
  };

  const sortedHorses = useMemo(() =>
    [...race.horses].sort((a, b) => {
      const isNRA = isHorseNR(a);
      const isNRB = isHorseNR(b);

      // Always push non-runners to the bottom
      if (isNRA !== isNRB) return isNRA ? 1 : -1;

      if (sortBy === 'avg') return getAvg(b) - getAvg(a);
      if (sortBy === 'high') return getMax(b) - getMax(a);
      if (sortBy === 'last') return getLast(b) - getLast(a);
      if (sortBy === 'all') return getAllAvg(b) - getAllAvg(a);
      if (sortBy === 'odds') return getLatestOdds(a) - getLatestOdds(b);
      return Number(a.number) - Number(b.number);
    }),
    [race.horses, sortBy, aiMode, wValue, dValue, gValue, approvedNonRunners, rejectedNonRunners, pendingNonRunners]
  );

  const getFavouredSelections = (horses) => {
    // Filter active runners first
    const activeRunners = (horses || []).filter(h => {
      const lastOdd = h.odds?.[h.odds.length - 1];
      return lastOdd !== "null" && lastOdd !== "NR" && !isHorseNR(h);
    });

    const totalRunners = activeRunners.length;
    if (totalRunners === 0) return [];

    // Determine the count based on the number of active runners today
    let count = 3;
    if (totalRunners <= 4) count = 1;
    else if (totalRunners > 4 && totalRunners < 8) count = 2;
    else if (totalRunners >= 8 && totalRunners < 16) count = 3;
    else if (totalRunners >= 16) count = 4;

    const selectedMap = new Map();

    // Helper to resolve the rating property based on aiMode
    const getRunRating = (p) => {
      if (!p) return 0;
      const targetProp = aiMode === 2 ? p.name2AI : aiMode === 1 ? p.nameAI : p.name;
      return parseFloat(targetProp) || 0;
    };

    // Helper metrics for selection criteria
    const getBestEverRating = (h) => Math.max(...(h.past || []).map(p => getRunRating(p)), 0);

    const getAverageLast3 = (h) => {
      const runs = (h.past || []).slice(0, 3);
      if (runs.length === 0) return 0;
      const sum = runs.reduce((acc, curr) => acc + getRunRating(curr), 0);
      return sum / runs.length;
    };

    const getRecentRating = (h) => (h.past && h.past.length > 0) ? getRunRating(h.past[0]) : 0;

    // 1. Best average rating over the last 3 past runs
    const bestAvgHorse = [...activeRunners].sort((a, b) => getAverageLast3(b) - getAverageLast3(a))[0];
    if (bestAvgHorse && selectedMap.size < count) {
      selectedMap.set(bestAvgHorse.name, { ...bestAvgHorse, reason: 'Best 3-Run Average', icon: '📊' });
    }

    // 2. Best ever past rating over all past races
    const bestEverHorse = [...activeRunners].sort((a, b) => getBestEverRating(b) - getBestEverRating(a))[0];
    if (bestEverHorse && selectedMap.size < count && !selectedMap.has(bestEverHorse.name)) {
      selectedMap.set(bestEverHorse.name, { ...bestEverHorse, reason: 'Best Ever Rating', icon: '📈' });
    }

    // 3. Best most recent rating over the last 1 run
    const bestRecentHorse = [...activeRunners].sort((a, b) => getRecentRating(b) - getRecentRating(a))[0];
    if (bestRecentHorse && selectedMap.size < count && !selectedMap.has(bestRecentHorse.name)) {
      selectedMap.set(bestRecentHorse.name, { ...bestRecentHorse, reason: 'Best Recent Run', icon: '⏱️' });
    }

    // 4. HOT_TRAINERS selection (Highest rating over last 3 runs)
    if (selectedMap.size < count) {
      const activeTrainers = selectedTrainers !== null ? selectedTrainers : HOT_TRAINERS;
      const hotRunners = activeRunners.filter(h =>
        activeTrainers.some(ht => (h.trainer || '').toLowerCase().replaceAll('.', '').includes(ht.toLowerCase().replaceAll('.', '')))
      );

      if (hotRunners.length > 0) {
        const sortedHotRunners = hotRunners.sort((a, b) => getAverageLast3(b) - getAverageLast3(a));

        for (const h of sortedHotRunners) {
          if (selectedMap.size >= count) break;
          if (!selectedMap.has(h.name)) {
            selectedMap.set(h.name, { ...h, reason: 'Hot Trainer Form', icon: '🔥' });
          }
        }
      }
    }

    // 5. Fallback: Second highest ever past rating OR second highest average over last 3 runs
    if (selectedMap.size < count) {
      const remaining = activeRunners.filter(h => !selectedMap.has(h.name));

      remaining.sort((a, b) => {
        const metricB = Math.max(getBestEverRating(b), getAverageLast3(b));
        const metricA = Math.max(getBestEverRating(a), getAverageLast3(a));
        return metricB - metricA;
      });

      for (const h of remaining) {
        if (selectedMap.size >= count) break;
        selectedMap.set(h.name, { ...h, reason: 'Fallback Form Tier', icon: '🔄' });
      }
    }

    // Sort selections by odds
    const finalSelections = Array.from(selectedMap.values()).slice(0, count).sort((a, b) => {
      return getLatestOdds(a) - getLatestOdds(b);
    });

    // Calculate market insight strings
    const sortedByOdds = [...activeRunners].sort((a, b) => getLatestOdds(a) - getLatestOdds(b));
    const marketFav = sortedByOdds[0]?.number + " " + sortedByOdds[0]?.name || "Unknown";
    const marketSecondFav = sortedByOdds[1]?.number + " " + sortedByOdds[1]?.name || "Unknown";

    let insightText = `Market favours: ${marketFav}`;
    if (sortedByOdds.length > 1) {
      insightText += ` and: ${marketSecondFav}`;
    }

    // Append a structural object text block to the end of the array 
    // It matches a horse's object shape to keep lists from crashing when rendering
    finalSelections.push({
      name: insightText,
      isMarketInsight: true,
      reason: "",
      icon: ""
    });

    return finalSelections;
  };



  const showSuggestions = (selectedRace) => {
    const targetRace = selectedRace || race;
    setActiveChartRace(targetRace);
    const list = getFavouredSelections(targetRace.horses, 3);
    setSuggestions(list);
    setIsOpen(true);
  };

  const valueRunnersRanked = useMemo(() => {
    if (!highlightValues) return new Map();

    // Use active runners (ignore NR/non-price) so slider changes affect selection
    const activeRunners = race.horses.filter(h => getLatestOdds(h) !== Infinity);

    // Compute unique peak ratings using current slider-adjusted getMax
    const uniqueRatings = [...new Set(activeRunners.map(getMax))].sort((a, b) => b - a);

    const ranks = new Map();
    if (uniqueRatings.length === 0) return ranks;

    const top1 = uniqueRatings[0];
    const top2 = uniqueRatings[1];

    activeRunners.forEach(h => {
      const rtg = getMax(h);
      const horseId = h.number === 'NR' ? h.name : h.number;
      if (top1 !== undefined && rtg === top1) ranks.set(horseId, 'top');
      else if (top2 !== undefined && rtg === top2) ranks.set(horseId, 'second');
    });

    return ranks;
  }, [race.horses, highlightValues, aiMode, wValue, dValue, gValue, approvedNonRunners, rejectedNonRunners, pendingNonRunners]);



  const massiveSpikeHorseNumber = useMemo(() => {
    const activeRunners = race.horses.filter(h => getLatestOdds(h) !== Infinity);
    if (activeRunners.length < 2) return null;
    const sortedByPeak = [...activeRunners].sort((a, b) => getMax(b) - getMax(a));
    const topPeak = getMax(sortedByPeak[0]);
    const nextPeak = getMax(sortedByPeak[1]);
    const winner = sortedByPeak[0];

    // Find the race where the peak rating occurred to ensure it was a competitive effort
    const peakRun = (winner.past || []).find(p => getRating(p) === topPeak);
    let peakDistValid = false;

    if (peakRun) {
      const peakPos = parseInt(peakRun.position?.toString().split('/')[0], 10) || 0;
      peakDistValid = peakPos === 1;

      if (!peakDistValid && peakRun.distBeaten) {
        const db = peakRun.distBeaten.toString().toLowerCase().trim();
        const abbrev = ['shd', 'hd', 'nk', 'ns', 'dh'];
        if (abbrev.includes(db)) {
          peakDistValid = true;
        } else {
          const dNum = parseFloat(db);
          peakDistValid = !isNaN(dNum) && dNum < 2;
        }
      }
    }

    return (topPeak > 0 && topPeak >= nextPeak * 1.9 && peakDistValid) ? (winner.number === 'NR' ? winner.name : winner.number) : null;
  }, [race.horses, aiMode, wValue, dValue, gValue, approvedNonRunners, rejectedNonRunners, pendingNonRunners]);

  const selectHorseNumber = useMemo(() => {
    // 1. Filter out Non-Runners and invalid odds immediately
    const activeRunners = race?.horses?.filter(h =>
      h.number !== 'NR' &&
      getLatestOdds(h) !== Infinity
    ) || [];

    if (activeRunners.length === 0) return null;

    // 2. Find the horse with the highest getLast value
    const winner = [...activeRunners].sort((a, b) => getLast(b) - getLast(a))[0];

    // 3. Return the winning horse's number
    return winner.number === 'NR' ? winner.name : winner.number;
  }, [race.horses, aiMode, wValue, dValue, gValue, approvedNonRunners, rejectedNonRunners, pendingNonRunners]);


  const getRaceIcon = (r) => {
    if (!r) return '';
    const d = (r.detail || '').toLowerCase();
    const isH = d.includes('handicap') || d.includes('nursery');
    const isC1 = d.includes('class 1') || d.includes('class 2');
    const count = r.horses?.length || 0;

    const icons = [];
    if (isC1) icons.push('👑');
    if (isH) icons.push('⚖️');
    if ((isH || isC1) && count >= 8) icons.push('🏆');

    return icons.length > 0 ? icons.join(' ') : '🚫';
  };

  // Navigation logic for FormChart, OddsChart, and Favoured Suggestions Modals
  const currentIndex = allRaces.findIndex(r => r.time === activeChartRace.time && r.place === activeChartRace.place);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allRaces.length - 1 && currentIndex !== -1;

  const handlePrev = () => {
    if (hasPrev) {
      const prevRace = allRaces[currentIndex - 1];
      setActiveChartRace(prevRace);
      if (isOpen) {
        setSuggestions(getFavouredSelections(prevRace.horses, 3));
      }
      window.location.hash = `${currentDateStr}@${prevRace.time}${prevRace.place.replace(/\s+/g, '')}`;
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextRace = allRaces[currentIndex + 1];
      setActiveChartRace(nextRace);
      if (isOpen) {
        setSuggestions(getFavouredSelections(nextRace.horses, 3));
      }
      window.location.hash = `${currentDateStr}@${nextRace.time}${nextRace.place.replace(/\s+/g, '')}`;
    }
  };

  const openChart = () => {
    setActiveChartRace(race); // Reset to this card's race when opening
    setShowChart(true);
  };

  const openOdds = () => {
    setActiveChartRace(race); // Reset to this card's race when opening
    setShowOdds(true);
  };

  const trainerCounts = {};
  allRaces.forEach(race => {
    race.horses?.forEach(h => {
      const trainerName = h.trainer ? h.trainer.trim() : '';
      if (trainerName) {
        trainerCounts[trainerName] = (trainerCounts[trainerName] || 0) + 1;
      }
    });
  });

  const jockeyCounts = {};
  allRaces.forEach(race => {
    race.horses?.forEach(h => {
      const jockeyName = h.jockey ? h.jockey.trim() : '';
      if (jockeyName) {
        jockeyCounts[jockeyName] = (jockeyCounts[jockeyName] || 0) + 1;
      }
    });
  });

  const CpuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
    </svg>
  );

  const ClaudeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a1 1 0 0 1 1 1v4.757l3.364-3.364a1 1 0 1 1 1.414 1.414L14.414 9H19a1 1 0 1 1 0 2h-4.757l3.364 3.364a1 1 0 0 1-1.414 1.414L13 12.414V17a1 1 0 1 1-2 0v-4.757l-3.364 3.364a1 1 0 0 1-1.414-1.414L9.586 11H5a1 1 0 1 1 0-2h4.757L6.393 5.636a1 1 0 0 1 1.414-1.414L11 7.586V3a1 1 0 0 1 1-1z" />
    </svg>
  );

  const ChatGptIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Center Core */}
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />

      {/* Symmetrical Swirl Loops */}
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(0 12 12)" />
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(120 12 12)" />
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(180 12 12)" />
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(240 12 12)" />
      <ellipse cx="12" cy="7.5" rx="3.5" ry="2" transform="rotate(300 12 12)" />
    </svg>
  );

  // 2. Updated clean mapping object utilizing the local SVG components
  const aiButtonConfig = {
    0: { icon: <CpuIcon />, color: '#374151', title: "Turn on AI" },
    1: { icon: <ClaudeIcon />, color: '#F59E0B', title: "Using Claude" },
    2: { icon: <ChatGptIcon />, color: '#10B981', title: "Using ChatGPT" }
  };

  const currentConfig = aiButtonConfig[aiMode] || aiButtonConfig[0];


  return (
    <div id={raceId} className="race-card">
      <header className="race-header">
        <div className="race-title-group">
          <h2 className="race-title">

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                showSuggestions(race);
              }}
              title="Show race suggestions"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                marginRight: '8px',
                padding: 0,
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                opacity: 0.6,
                color: '#9ca3af',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.color = '#f97316';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.color = '#9ca3af';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ⚡
            </button>

            <a href={currentDateStr ? `#${currentDateStr}@${raceId}` : `#${raceId}`} className="race-title-link">
              {race.time} {race.place}
            </a>

            <button
              onClick={onToggleAlarm}
              title={isAlarmEnabled ? "Alarm active (4 mins before start)" : "Click to set alarm for this race"}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                marginLeft: '10px',
                padding: 0,
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                filter: isAlarmEnabled ? 'drop-shadow(0 0 5px #ffcc00) brightness(1.1)' : 'grayscale(1) opacity(0.3)',
                transform: isAlarmEnabled ? 'scale(1.15)' : 'scale(1)'
              }}
            >
              🔔
            </button>

          </h2>
          <h5 className="race-detail">{getRaceIcon(race)} {race.detail} {race.going} (Runners {race.runners}) FORM:{finalDisplay}</h5>
        </div>
        <div className="race-controls">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '2px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            fontSize: '13px'
          }}>
            <span>{SORT_LABELS[sortBy]}</span>
            <input
              type="range"
              min="0"
              max={SORT_MODES.length - 1}
              step="1"
              value={SORT_MODES.indexOf(sortBy)}
              title="Sort by"
              onChange={(e) => setSortBy(SORT_MODES[parseInt(e.target.value, 10)])}
              style={{ width: '70px', cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
          </div>
          <button
            onClick={() => toggleAi()}
            className="race-analytics-btn"
            title={currentConfig.title}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',

              // 1. Force explicit dimensions so the button never shrinks or jumps shapes
              width: '42px',
              height: '42px',

              backgroundColor: currentConfig.color,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              padding: '0' // Clear padding since width/height handle sizing now
            }}
          >
            <span style={{
              fontSize: '1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%'
            }}>
              {currentConfig.icon}
            </span>
          </button>
          <button onClick={openOdds} className="race-analytics-btn" title="View Odds Movement">
            <span style={{ fontSize: '1.5rem' }}>📊</span>
          </button>
          <button onClick={openChart} className="race-analytics-btn" title="View Past Performance Chart">
            <span style={{ fontSize: '1.5rem' }}>📈</span>
          </button>
        </div>
      </header>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`⚡ Favoured Suggestions • ${activeChartRace.time} ${activeChartRace.place}`}
      >
        <div style={{ padding: '16px', color: 'var(--text)', maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ minWidth: '95px' }}>
              {hasPrev && (
                <button className="race-analytics-btn" onClick={handlePrev}>
                  ← Prev Race
                </button>
              )}
            </div>

            <div style={{ textAlign: 'center', flex: 1 }}>
              <h3 style={{ margin: 0, color: 'var(--text-h)', fontSize: '1.15rem' }}>
                {activeChartRace.name || activeChartRace.detail || `${activeChartRace.time} ${activeChartRace.place}`}
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>
                {getRaceIcon(activeChartRace)} {activeChartRace.detail} • Going: {activeChartRace.going} • Runners: {activeChartRace.runners}
              </div>
            </div>

            <div style={{ minWidth: '95px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
              {suggestions.length === 3 && (
                <div style={{
                  textAlign: 'right',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Est. Tricast</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4ade80' }}>
                    {Math.round(suggestions.reduce((acc, h) => acc * (parseFloat(h.odds?.[h.odds.length - 1]) || 0), 1))}/1
                  </div>
                </div>
              )}
              {hasNext && (
                <button className="race-analytics-btn" onClick={handleNext}>
                  Next Race →
                </button>
              )}
            </div>
          </div>

          {suggestions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '30px 0' }}>
              No active runners available to generate suggestions.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {suggestions.map((horse, idx) => {
                const oddsArr = horse.odds || [];
                const currentOdds = oddsArr[oddsArr.length - 1];
                const prevOdds = oddsArr.length > 1 ? oddsArr[oddsArr.length - 2] : null;
                const curNum = parseFloat(currentOdds);
                const prevNum = parseFloat(prevOdds);
                let oddsArrow = null;
                if (!isNaN(curNum) && !isNaN(prevNum)) {
                  if (curNum < prevNum) oddsArrow = <span style={{ color: '#ef4444', marginLeft: '4px' }}>▲</span>;
                  else if (curNum > prevNum) oddsArrow = <span style={{ color: '#3b82f6', marginLeft: '4px' }}>▼</span>;
                  else oddsArrow = <span style={{ color: 'var(--text)', opacity: 0.5, marginLeft: '4px' }}>~</span>;
                }

                return (
                  <div
                    key={horse.name || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border)',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        color: '#fbbf24',
                        width: '26px',
                        textAlign: 'center'
                      }}>
                        #{horse.number}
                      </span>
                      {horse.silks && (
                        <img
                          src={horse.silks}
                          alt="silks"
                          style={{ width: '26px', height: '26px', objectFit: 'contain', borderRadius: '2px' }}
                        />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ color: 'var(--text-h)', fontSize: '1.05rem' }}>
                            {horse.name}
                          </strong>
                          {horse.draw && (
                            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>({horse.draw})</span>
                          )}
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(251, 191, 36, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            fontWeight: '600'
                          }}>
                            {horse.icon} {horse.reason}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '3px' }}>
                          {horse.trainer && <span>T: {horse.trainer}</span>}
                          {horse.jockey && <span style={{ marginLeft: '10px' }}>J: {horse.jockey}</span>}
                          {horse.form && <span style={{ marginLeft: '10px', fontFamily: 'monospace' }}>Form: {horse.form}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#4ade80' }}>
                        {currentOdds || '—'}
                        {oddsArrow}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <ThreeSliders wValue={wValue} setW={setW} dValue={dValue} setD={setD} gValue={gValue} setG={setG} />

      <Modal
        isOpen={showOdds}
        onClose={() => setShowOdds(false)}
        title={`Odds Movement: ${activeChartRace.time} ${activeChartRace.place}`}
      >
        <OddsChart
          horses={activeChartRace.horses}
          raceTime={activeChartRace.time}
          racePlace={activeChartRace.place}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={hasNext}
          hasPrev={hasPrev}
          pendingNonRunners={pendingNonRunners}
          approvedNonRunners={approvedNonRunners}
          rejectedNonRunners={rejectedNonRunners}
        />
      </Modal>

      <Modal
        isOpen={showChart}
        onClose={() => setShowChart(false)}
        title={`${activeChartRace.time} ${activeChartRace.place} - ${getRaceIcon(activeChartRace)} ${activeChartRace.detail} ${activeChartRace.going} (Runners ${activeChartRace.runners})`}
      >
        <FormChart
          horses={activeChartRace.horses}
          raceTime={activeChartRace.time}
          racePlace={activeChartRace.place}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={hasNext}
          hasPrev={hasPrev}
          todayDistance={activeChartRace.distance}
          todayGoing={activeChartRace.going}
          viewMode={viewMode} // Pass down viewMode
          currentDateStr={currentDateStr} // Pass down currentDateStr
          pendingNonRunners={pendingNonRunners}
          approvedNonRunners={approvedNonRunners}
          rejectedNonRunners={rejectedNonRunners}
        />
      </Modal>

      <div className="entries">
        {sortedHorses.map(horse => {
          const horseId = horse.number === 'NR' ? horse.name : horse.number;
          const rank = valueRunnersRanked.get(horseId);
          const isMassive = horseId === massiveSpikeHorseNumber;
          const isValue = highlightValues && horse.isValue;
          const isSelect = highlightSelects && horseId === selectHorseNumber;

          const currentTrainer = horse.trainer ? horse.trainer.trim() : '';
          const isSoleRunner = trainerCounts[currentTrainer] === 1;

          const currentJockey = horse.jockey ? horse.jockey.trim() : '';
          const isSoleRide = jockeyCounts[currentJockey] === 1;

          return (
            <HorseRow
              key={`${raceId}-${horse.number || 'NR'}-${horse.name}`}
              horse={horse}
              isSoleTrainerRunner={isSoleRunner}
              isSoleRide={isSoleRide}
              sortBy={sortBy}
              highlightFiddle={highlightFiddles && horse.isFiddle}
              highlightValue={
                isMassive && isValue ? 'massive' :
                  rank
              }
              highlightSelect={isSelect}
              wValue={wValue}
              dValue={dValue}
              gValue={gValue}
              todayDistance={race.distance}
              todayGoing={race.going}
              raceTime={race.time}
              racePlace={race.place}
              pendingNonRunners={pendingNonRunners}
              approvedNonRunners={approvedNonRunners}
              rejectedNonRunners={rejectedNonRunners}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RaceCard;