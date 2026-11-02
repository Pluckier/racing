import React, { useEffect, useRef, useState, useMemo } from 'react';

// Default fallback field if no race/horses are passed
const DEFAULT_TURF_FIELD = [
    { id: 1, name: "Diamond Necklace", baseSpeed: 2.30, variance: 0.35, number: 1 },
    { id: 2, name: "Bay City Roller", baseSpeed: 2.25, variance: 0.40, number: 2 },
    { id: 3, name: "Benvenuto Cellini", baseSpeed: 2.22, variance: 0.42, number: 3 },
    { id: 4, name: "Burnham Square", baseSpeed: 2.18, variance: 0.45, number: 4 },
    { id: 5, name: "Ethical Diamond", baseSpeed: 2.15, variance: 0.50, number: 5 },
    { id: 6, name: "Tiffany", baseSpeed: 2.15, variance: 0.48, number: 6 },
    { id: 7, name: "Johanna Walsh", baseSpeed: 2.12, variance: 0.52, number: 7 },
    { id: 8, name: "Bay Bridge", baseSpeed: 2.14, variance: 0.44, number: 8 },
    { id: 9, name: "El Cordobes", baseSpeed: 2.10, variance: 0.55, number: 9 },
    { id: 10, name: "Hotazhell", baseSpeed: 2.10, variance: 0.58, number: 10 },
    { id: 11, name: "Minaret Station", baseSpeed: 2.08, variance: 0.60, number: 11 },
    { id: 12, name: "Survie", baseSpeed: 2.08, variance: 0.55, number: 12 },
    { id: 13, name: "Far Bridge", baseSpeed: 2.05, variance: 0.62, number: 13 },
    { id: 14, name: "Deep Monster", baseSpeed: 2.00, variance: 0.70, number: 14 }
];

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
    const hudHeight = 50;
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const horsesRef = useRef([]); // Uses ref mutable properties to prevent state updates mid-loop

    const [raceState, setRaceState] = useState('ready'); // ready, racing, finished
    const [statusMessage, setStatusMessage] = useState('');

    const time = race?.time || raceTime || '';
    const place = race?.place || racePlace || '';
    const raceTitle = race?.name || race?.detail || (time && place ? `${time} ${place}` : "Breeders' Cup Turf");

    // Process raw horses into parameterized field
    const fieldData = useMemo(() => {
        const rawList = horses || race?.horses;
        if (!rawList || rawList.length === 0) {
            return DEFAULT_TURF_FIELD.map((horse, index, arr) => ({
                ...horse,
                color: horse.color || `hsl(${(index * 360) / arr.length}, 85%, 55%)`
            }));
        }

        // Filter out non-runners
        const active = rawList.filter((h) => {
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

        const runners = active.length > 0 ? active : rawList;

        // Compute relative strengths based on odds or ratings
        const strengths = runners.map((h) => {
            if (typeof h.baseSpeed === 'number') {
                return { horse: h, strength: h.baseSpeed, explicit: true };
            }
            const oddsInfo = getLatestOddsInfo(h);
            if (oddsInfo && oddsInfo.decimal > 0) {
                // Lower odds = higher implied probability
                return { horse: h, strength: 1 / oddsInfo.decimal, oddsInfo, explicit: false };
            }
            if (h.past && h.past.length > 0) {
                const ratings = h.past
                    .map((p) => parseFloat(p.name2AI || p.nameAI || p.name) || 0)
                    .filter((r) => r > 0);
                if (ratings.length > 0) {
                    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                    return { horse: h, strength: avg, oddsInfo, explicit: false };
                }
            }
            return { horse: h, strength: 1, oddsInfo, explicit: false };
        });

        const numericStrengths = strengths.map((s) => s.strength);
        const minStrength = Math.min(...numericStrengths);
        const maxStrength = Math.max(...numericStrengths);
        const range = maxStrength - minStrength;

        return strengths.map(({ horse, strength, oddsInfo, explicit }, index) => {
            let baseSpeed = horse.baseSpeed;
            let variance = horse.variance;

            if (!explicit || typeof baseSpeed !== 'number') {
                const t = range > 0 ? (strength - minStrength) / range : 0.5;
                // Favorites (t -> 1): baseSpeed ~2.30, variance ~0.36
                // Outsiders (t -> 0): baseSpeed ~2.05, variance ~0.65
                baseSpeed = +(2.05 + t * 0.25).toFixed(2);
                variance = +(0.65 - t * 0.29).toFixed(2);
            }

            const horseColor = horse.color || `hsl(${(index * 360) / runners.length}, 85%, 55%)`;

            return {
                id: horse.id ?? horse.number ?? (index + 1),
                number: horse.number ?? (index + 1),
                name: horse.name || `Horse ${index + 1}`,
                draw: horse.draw,
                jockey: horse.jockey,
                trainer: horse.trainer,
                latestOdds: oddsInfo?.display || null,
                baseSpeed,
                variance,
                color: horseColor
            };
        });
    }, [race, horses, time, place, pendingNonRunners, approvedNonRunners, rejectedNonRunners]);

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

    // Dedicated Render Engine function called inside frame loops
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
        horsesRef.current.forEach((horse, index) => {
            ctx.beginPath();
            ctx.arc(horse.x, horse.y, horse.radius, 0, Math.PI * 2);
            ctx.fillStyle = horse.color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Number inside circle if large enough
            if (horse.radius >= 8) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.round(horse.radius * 0.9)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${horse.number ?? (index + 1)}`, horse.x, horse.y);
                ctx.textAlign = 'start';
                ctx.textBaseline = 'alphabetic';
            }

            // Name & Odds text
            ctx.fillStyle = '#ffffff';
            const fontSize = Math.max(9, Math.min(13, laneHeight * 0.38));
            ctx.font = `bold ${fontSize}px Arial`;
            const oddsSuffix = horse.latestOdds ? ` (${horse.latestOdds})` : '';
            ctx.fillText(`${horse.name}${oddsSuffix}`, horse.x + horse.radius + 8, horse.y + fontSize * 0.35);
        });
    };

    // Main Loop Manager
    const updateRaceFrame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const finishLineX = canvas.width - (canvas.width > 600 ? 160 : 110);

        let winnerFound = null;

        horsesRef.current.forEach((horse) => {
            const acceleration = (Math.random() - 0.5) * horse.variance;
            const scaleFactor = canvas.width / 1100;
            const speedMultiplier = 2; // Higher = faster race (e.g., 2 to 3 seconds total)
            horse.x += Math.max(0.1, (horse.baseSpeed + acceleration) * scaleFactor * speedMultiplier);

            if (horse.x >= finishLineX && !winnerFound) {
                winnerFound = horse;
            }
        });

        drawTrackAndField(ctx, canvas.width, canvas.height);

        if (winnerFound) {
            cancelAnimationFrame(requestRef.current);
            setRaceState('finished');
            const numStr = winnerFound.number ? `#${winnerFound.number} ` : '';
            const oddsStr = winnerFound.latestOdds ? ` (${winnerFound.latestOdds})` : '';
            const venueStr = place ? ` AT ${place.toUpperCase()}` : '';
            setStatusMessage(`🥇 ${numStr}${winnerFound.name.toUpperCase()}${oddsStr} WINS${venueStr}!`);
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
            // Let Flexbox handle the height, read the exact space available for the canvas
            const width = container.clientWidth || 800;
            const height = canvas.clientHeight || 400; // Reads the exact rendered box height

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

        // Get initial layout container values cleanly
        const initialWidth = container.clientWidth || 800;
        const initialHeight = container.clientHeight ? Math.max(container.clientHeight - hudHeight, 300) : 400;

        canvas.width = initialWidth;
        canvas.height = initialHeight;

        initHorses(initialWidth, initialHeight);
        handleResize();
        setRaceState('ready');
        setStatusMessage(`${raceTitle} • ${fieldData.length} Runners Ready`);

        let resizeObserver;
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                // Throttle/De-bounce lookups natively through standard layout boundaries
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
            setStatusMessage("They are moving into the gates...");
        } else {
            setRaceState('racing');
            setStatusMessage(place ? `And they are away at ${place}!` : "And they are away on the turf course!");
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
                    fontSize: '14px',
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
