import React, { useEffect, useRef, useState, useMemo } from 'react';

// Default fallback field if no race/horses are passed
// Structured so that:
// - #2 Bay City Roller has highest recent rating (99) -> leads out of gates
// - #3 Benvenuto Cellini has highest best ever rating (105) -> leads midway
// - #1 Diamond Necklace has highest 3-run average (93.7) -> wins the race at the line
const DEFAULT_TURF_FIELD = [
    { id: 1, name: "Diamond Necklace", number: 1, past: [{ name: "92" }, { name: "95" }, { name: "94" }] },
    { id: 2, name: "Bay City Roller", number: 2, past: [{ name: "99" }, { name: "82" }, { name: "84" }] },
    { id: 3, name: "Benvenuto Cellini", number: 3, past: [{ name: "85" }, { name: "105" }, { name: "88" }] },
    { id: 4, name: "Burnham Square", number: 4, past: [{ name: "88" }, { name: "90" }, { name: "89" }] },
    { id: 5, name: "Ethical Diamond", number: 5, past: [{ name: "86" }, { name: "88" }, { name: "87" }] },
    { id: 6, name: "Tiffany", number: 6, past: [{ name: "84" }, { name: "85" }, { name: "86" }] },
    { id: 7, name: "Johanna Walsh", number: 7, past: [{ name: "83" }, { name: "84" }, { name: "85" }] },
    { id: 8, name: "Bay Bridge", number: 8, past: [{ name: "82" }, { name: "83" }, { name: "84" }] },
    { id: 9, name: "El Cordobes", number: 9, past: [{ name: "80" }, { name: "82" }, { name: "81" }] },
    { id: 10, name: "Hotazhell", number: 10, past: [{ name: "79" }, { name: "80" }, { name: "82" }] },
    { id: 11, name: "Minaret Station", number: 11, past: [{ name: "78" }, { name: "79" }, { name: "80" }] },
    { id: 12, name: "Survie", number: 12, past: [{ name: "77" }, { name: "78" }, { name: "79" }] },
    { id: 13, name: "Far Bridge", number: 13, past: [{ name: "75" }, { name: "77" }, { name: "76" }] },
    { id: 14, name: "Deep Monster", number: 14, past: [{ name: "72" }, { name: "74" }, { name: "73" }] }
];

// Helper to extract numeric rating from past race "name" property
const getPastRating = (run) => {
    if (!run) return 0;
    const val = parseFloat(run.name ?? run.nameAI ?? run.name2AI);
    return isNaN(val) ? 0 : val;
};

// Helper to parse odd values (handles decimal, fractions like "7/2", "EVS", etc.)
const parseOddsToDecimal = (oddStr) => {
    if (typeof oddStr === 'number') return oddStr;
    if (!oddStr || typeof oddStr !== 'string') return null;
    const trimmed = oddStr.trim();
    if (/^ev(en)?s?$/i.test(trimmed)) return 2.0;
    if (trimmed.includes('/')) {
        const [num, den] = trimmed.split('/').map(Number);
        if (!isNaN(num) && !isNaN(den) && den > 0) {
            return (num / den) + 1.0;
        }
    }
    const val = parseFloat(trimmed);
    return !isNaN(val) && val > 0 ? val : null;
};

const getLatestOddsInfo = (horse) => {
    const odds = horse.odds || [];
    for (let i = odds.length - 1; i >= 0; i--) {
        const odd = odds[i];
        if (odd && odd !== 'null' && odd !== 'NR') {
            const dec = parseOddsToDecimal(odd);
            if (dec) return { display: String(odd), decimal: dec };
        }
    }
    return null;
};

// Compute smooth phase blending weights across race progress tau in [0, 1]
// Out of gates: Recent rating dominant
// Midway: Best ever rating dominant
// Finish: Avg of last 3 runs dominant
const getPhaseWeights = (tau) => {
    if (tau <= 0.5) {
        const t = tau / 0.5; // 0 to 1
        const smooth = t * t * (3 - 2 * t);
        return {
            w1: 1 - smooth,
            w2: smooth,
            w3: 0
        };
    } else {
        const t = (tau - 0.5) / 0.5; // 0 to 1
        const smooth = t * t * (3 - 2 * t);
        return {
            w1: 0,
            w2: 1 - smooth,
            w3: smooth
        };
    }
};

export default function HorseRaceSimulator({
    race,
    horses,
    raceTime = '',
    racePlace = '',
    pendingNonRunners = new Set(),
    approvedNonRunners = new Set(),
    rejectedNonRunners = new Set(),
    onNext,
    onPrev,
    hasNext = false,
    hasPrev = false
}) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const startTimeRef = useRef(0);
    const horsesRef = useRef([]);

    const [raceState, setRaceState] = useState('ready'); // ready, racing, finished
    const [statusMessage, setStatusMessage] = useState('');

    const time = race?.time || raceTime || '';
    const place = race?.place || racePlace || '';
    const raceTitle = race?.name || race?.detail || (time && place ? `${time} ${place}` : "Breeders' Cup Turf");

    // Process raw horses into parameterized field with ratings
    const fieldData = useMemo(() => {
        const rawList = horses || race?.horses;
        const baseList = (!rawList || rawList.length === 0) ? DEFAULT_TURF_FIELD : rawList;

        // 1. Filter out non-runners
        const active = baseList.filter((h) => {
            if (time && place) {
                const horseKey = `${h.name}@${time}${place}`;
                if (rejectedNonRunners?.has?.(horseKey)) return true;
                if (approvedNonRunners?.has?.(horseKey)) return false;
                if (pendingNonRunners?.has?.(horseKey)) return true;
            }
            if (h.number === 'NR' || h.isNR) return false;
            const odds = h.odds || [];
            const last = odds[odds.length - 1];
            if (last === 'null' || last === 'NR') return false;
            return true;
        });

        const runners = active.length > 0 ? active : baseList;

        // 2. Extract the 3 key rating metrics for each horse
        const horseMetrics = runners.map((h, index) => {
            const runs = h.past || [];

            // Recent: rating of the most recent past race (name property)
            const recentRating = runs.length > 0 ? getPastRating(runs[0]) : 0;

            // Best Ever: max rating over all past races (name property)
            const bestEverRating = runs.length > 0 ? Math.max(...runs.map(getPastRating), 0) : 0;

            // Avg 3: average over the last three past runs (name property)
            const last3 = runs.slice(0, 3);
            const avg3Rating = last3.length > 0
                ? last3.reduce((sum, r) => sum + getPastRating(r), 0) / last3.length
                : 0;

            const oddsInfo = getLatestOddsInfo(h);

            return {
                id: h.id ?? h.number ?? (index + 1),
                number: h.number ?? (index + 1),
                name: h.name || `Horse ${index + 1}`,
                draw: h.draw,
                jockey: h.jockey,
                trainer: h.trainer,
                latestOdds: oddsInfo?.display || null,
                color: h.color || `hsl(${(index * 360) / runners.length}, 85%, 55%)`,
                recentRating,
                bestEverRating,
                avg3Rating,
                rawIndex: index
            };
        });

        // 3. Compute normalized scores in [0.0, 1.0] for each metric
        // Combines actual rating proportionality with rank order so the top horse is 1.0, lowest is 0.0
        const normalizeMetric = (list, key, scoreProp) => {
            const n = list.length;
            if (n <= 1) {
                return list.map(item => ({ ...item, [scoreProp]: 1.0 }));
            }

            const sorted = [...list].sort((a, b) => {
                const diff = b[key] - a[key];
                if (Math.abs(diff) > 0.0001) return diff;
                return a.rawIndex - b.rawIndex;
            });

            const minVal = sorted[sorted.length - 1][key];
            const maxVal = sorted[0][key];
            const range = maxVal - minVal;

            const scoreMap = new Map();
            sorted.forEach((item, rank) => {
                const rankRatio = (n - 1 - rank) / (n - 1);
                const propScore = range > 0 ? (item[key] - minVal) / range : rankRatio;
                // 70% proportional rating gap + 30% strict rank ratio
                const score = 0.70 * propScore + 0.30 * rankRatio;
                scoreMap.set(item.id, score);
            });

            return list.map(item => ({
                ...item,
                [scoreProp]: scoreMap.get(item.id) ?? 0.5
            }));
        };

        let processed = normalizeMetric(horseMetrics, 'recentRating', 'recentScore');
        processed = normalizeMetric(processed, 'bestEverRating', 'bestScore');
        processed = normalizeMetric(processed, 'avg3Rating', 'avg3Score');

        return processed;
    }, [race, horses, time, place, pendingNonRunners, approvedNonRunners, rejectedNonRunners]);

    // Leaders for dynamic HUD commentary
    const leaders = useMemo(() => {
        if (!fieldData || fieldData.length === 0) return { recent: null, best: null, avg3: null };
        const sortBy = (prop) => [...fieldData].sort((a, b) => b[prop] - a[prop])[0];
        return {
            recent: sortBy('recentRating'),
            best: sortBy('bestEverRating'),
            avg3: sortBy('avg3Rating')
        };
    }, [fieldData]);

    // Initialize mutable horse positions array
    const initHorses = (width, height) => {
        const count = fieldData.length || 1;
        const laneHeight = height / count;

        horsesRef.current = fieldData.map((data, index) => ({
            ...data,
            x: 60,
            y: index * laneHeight + laneHeight / 2,
            radius: Math.max(5, Math.min(13, laneHeight * 0.32))
        }));
    };

    // Dedicated Render Engine
    const drawTrackAndField = (ctx, width, height) => {
        ctx.clearRect(0, 0, width, height);
        const count = horsesRef.current.length || 1;
        const laneHeight = height / count;
        const finishLineX = width - (width > 600 ? 160 : 110);

        // 1. Draw lanes
        horsesRef.current.forEach((horse, index) => {
            const currentY = index * laneHeight;
            ctx.fillStyle = index % 2 === 0 ? "#116f38" : "#1e8449";
            ctx.fillRect(0, currentY, width, laneHeight);

            ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, currentY);
            ctx.lineTo(width, currentY);
            ctx.stroke();

            // Saddle cloth number at lane start
            ctx.fillStyle = "#f1c40f";
            ctx.font = `bold ${Math.max(10, Math.min(14, laneHeight * 0.45))}px Arial`;
            ctx.fillText(`${horse.number ?? (index + 1)}`, 16, currentY + laneHeight / 2 + laneHeight * 0.15);
        });

        // 2. Draw Finish Ribbon
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(finishLineX, 0);
        ctx.lineTo(finishLineX, height);
        ctx.stroke();

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.fillText("FINISH", finishLineX, 14);
        ctx.textAlign = "start";

        // 3. Draw Horses
        horsesRef.current.forEach((horse) => {
            ctx.beginPath();
            ctx.arc(horse.x, horse.y, horse.radius, 0, Math.PI * 2);
            ctx.fillStyle = horse.color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Saddle cloth number inside circle
            if (horse.radius >= 8) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.round(horse.radius * 0.9)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${horse.number ?? ''}`, horse.x, horse.y);
                ctx.textAlign = 'start';
                ctx.textBaseline = 'alphabetic';
            }

            // Name & Ratings label
            ctx.fillStyle = '#ffffff';
            const fontSize = Math.max(9, Math.min(13, laneHeight * 0.38));
            ctx.font = `bold ${fontSize}px Arial`;

            const oddsStr = horse.latestOdds ? ` (${horse.latestOdds})` : '';
            ctx.fillText(`${horse.name}${oddsStr}`, horse.x + horse.radius + 8, horse.y + fontSize * 0.35);
        });
    };

    // Physics Loop Manager: Strictly controlled rating speed engine
    const updateRaceFrame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const finishLineX = canvas.width - (canvas.width > 600 ? 160 : 110);
        const startX = 60;
        const totalDistance = finishLineX - startX;

        const raceDurationMs = 5000; // 6.5s full race
        const elapsed = performance.now() - startTimeRef.current;
        const tau = Math.min(1.0, elapsed / raceDurationMs);

        // Calculate phase weights:
        // tau in [0, 0.35]: recent rating leads out of gates
        // tau in [0.35, 0.7]: best ever rating takes lead midway
        // tau in [0.7, 1.0]: highest 3-run average powers through to win at finish
        const { w1, w2, w3 } = getPhaseWeights(tau);

        // Dynamic pack spread: starts at 0 and expands naturally
        const maxSpread = Math.min(110, totalDistance * 0.16);
        const currentSpread = Math.min(1.0, tau * 3.5) * maxSpread;

        // Base progress such that leader touches finishLineX exactly when tau = 1.0
        const baseProgress = startX + tau * (totalDistance - currentSpread);

        // Update horse positions strictly according to ratings
        horsesRef.current.forEach((horse, index) => {
            const currentScore = w1 * horse.recentScore + w2 * horse.bestScore + w3 * horse.avg3Score;
            // Subtle stride oscillation that tapers to 0 at finish for exact photo finish
            const stride = Math.sin((elapsed / 120) + index * 1.5) * 1.5 * (1 - tau);
            horse.x = baseProgress + (currentScore * currentSpread) + stride;
        });

        drawTrackAndField(ctx, canvas.width, canvas.height);

        // Live commentary HUD updates matching the 3 race phases
        if (tau < 0.35 && leaders.recent) {
            setStatusMessage(`Gate Open! #${leaders.recent.number} ${leaders.recent.name} leads out with best recent form (${leaders.recent.recentRating.toFixed(1)})`);
        } else if (tau >= 0.35 && tau < 0.70 && leaders.best) {
            setStatusMessage(`Midway! #${leaders.best.number} ${leaders.best.name} surges ahead with best ever rating (${leaders.best.bestEverRating.toFixed(1)})`);
        } else if (tau >= 0.70 && tau < 1.0 && leaders.avg3) {
            setStatusMessage(`Home Straight! #${leaders.avg3.number} ${leaders.avg3.name} powering on with top 3-run average (${leaders.avg3.avg3Rating.toFixed(1)})`);
        }

        if (tau >= 1.0) {
            cancelAnimationFrame(requestRef.current);
            setRaceState('finished');
            // Winner is strictly the horse with the highest avg3Rating
            const winner = leaders.avg3 || horsesRef.current[0];
            const numStr = winner.number ? `#${winner.number} ` : '';
            const avgStr = winner.avg3Rating ? ` (Avg 3: ${winner.avg3Rating.toFixed(1)})` : '';
            const venueStr = place ? ` AT ${place.toUpperCase()}` : '';
            setStatusMessage(`🥇 ${numStr}${winner.name.toUpperCase()} WINS${venueStr}!${avgStr}`);
        } else {
            requestRef.current = requestAnimationFrame(updateRaceFrame);
        }
    };

    // Reset / Reinitialize on fieldData or container resize
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;
        const ctx = canvas.getContext('2d');

        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }

        const handleResize = () => {
            const width = container.clientWidth || 800;
            const height = container.clientHeight ? Math.max(container.clientHeight - 50, 300) : 450;
            canvas.width = width;
            canvas.height = height;

            const count = horsesRef.current.length || 1;
            const laneHeight = height / count;

            horsesRef.current.forEach((horse, index) => {
                horse.y = index * laneHeight + laneHeight / 2;
                horse.radius = Math.max(5, Math.min(13, laneHeight * 0.32));
            });

            drawTrackAndField(ctx, width, height);
        };

        const initialWidth = container.clientWidth || 800;
        const initialHeight = container.clientHeight ? Math.max(container.clientHeight - 50, 300) : 450;
        initHorses(initialWidth, initialHeight);
        handleResize();
        setRaceState('ready');
        setStatusMessage(`${raceTitle} • ${fieldData.length} Runners Ready`);

        let resizeObserver;
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                handleResize();
            });
            resizeObserver.observe(container);
        }
        window.addEventListener('resize', handleResize);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (resizeObserver) resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [fieldData, raceTitle]);

    const handleControlClick = () => {
        if (raceState === 'racing') return;

        if (raceState === 'finished') {
            const canvas = canvasRef.current;
            if (!canvas) return;
            initHorses(canvas.width, canvas.height);
            drawTrackAndField(canvas.getContext('2d'), canvas.width, canvas.height);
            setRaceState('ready');
            setStatusMessage(`${raceTitle} • Ready to Run`);
        } else {
            setRaceState('racing');
            startTimeRef.current = performance.now();
            requestRef.current = requestAnimationFrame(updateRaceFrame);
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '400px',
                overflow: 'hidden',
                backgroundColor: '#0d2015',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Top HUD Bar */}
            <div style={{
                height: '50px',
                flexShrink: 0,
                background: 'linear-gradient(90deg, #114b29 0%, #0e3a20 100%)',
                borderBottom: '3px solid #f1c40f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                zIndex: 10,
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={handleControlClick}
                        disabled={raceState === 'racing'}
                        style={{
                            padding: '6px 18px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            backgroundColor: '#f1c40f',
                            color: '#114b29',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: raceState === 'racing' ? 'not-allowed' : 'pointer',
                            opacity: raceState === 'racing' ? 0.6 : 1,
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}
                    >
                        {raceState === 'finished' ? 'Reset Gates' : raceState === 'racing' ? 'Racing...' : 'Gate Open'}
                    </button>
                </div>

                <div style={{
                    color: '#f1c40f',
                    fontSize: '13.5px',
                    fontWeight: 'bold',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {statusMessage}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {hasPrev && onPrev && (
                        <button
                            onClick={onPrev}
                            disabled={raceState === 'racing'}
                            style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: '#f1c40f',
                                border: '1px solid #f1c40f',
                                borderRadius: '4px',
                                cursor: raceState === 'racing' ? 'not-allowed' : 'pointer'
                            }}
                        >
                            ← Prev
                        </button>
                    )}
                    {hasNext && onNext && (
                        <button
                            onClick={onNext}
                            disabled={raceState === 'racing'}
                            style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: '#f1c40f',
                                border: '1px solid #f1c40f',
                                borderRadius: '4px',
                                cursor: raceState === 'racing' ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Next →
                        </button>
                    )}
                </div>
            </div>

            {/* Turf Track Canvas */}
            <canvas
                ref={canvasRef}
                style={{
                    display: 'block',
                    flex: 1,
                    width: '100%',
                    backgroundColor: '#1e8449'
                }}
            />
        </div>
    );
}
