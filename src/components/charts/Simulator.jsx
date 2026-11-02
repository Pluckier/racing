import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPaletteSync } from 'colorthief';
import { LINE_COLORS } from '../../constants/chartConstants';
import { formatRaceResult, getAnnouncedPlacesCount } from '../../utils/racingLogic';

// Horse coat color palette based on breeding
export const HORSE_COAT_COLORS = {
    bay: {
        body: '#8B4513',      // Saddle / Mahogany Bay
        mane: '#1A1A1A',      // Black points / mane / tail
        label: 'Bay',
        code: 'b'
    },
    chestnut: {
        body: '#C05A1E',      // Rich copper / golden red chestnut
        mane: '#D97724',      // Flaxen / copper mane
        label: 'Chestnut',
        code: 'ch'
    },
    grey: {
        body: '#D8D8E0',      // Silver / light slate grey
        mane: '#9C9CA8',      // Slate grey mane
        label: 'Grey',
        code: 'gr'
    },
    black: {
        body: '#222225',      // Midnight obsidian black
        mane: '#0D0D0E',      // Jet black mane
        label: 'Black',
        code: 'bl'
    },
    brown: {
        body: '#4A2E18',      // Deep chocolate brown
        mane: '#1C110A',      // Dark espresso brown
        label: 'Brown',
        code: 'br'
    }
};

// Styling configuration for race finish result splash popup
export const RESULT_POSITION_CONFIG = [
    { label: '1st', medal: '🥇', bg: 'linear-gradient(135deg, #f1c40f, #d4ac0d)', color: '#000000', border: '#f39c12' },
    { label: '2nd', medal: '🥈', bg: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', color: '#0f172a', border: '#94a3b8' },
    { label: '3rd', medal: '🥉', bg: 'linear-gradient(135deg, #f59e0b, #b45309)', color: '#ffffff', border: '#92400e' },
    { label: '4th', medal: '🎖️', bg: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: '#ffffff', border: '#0369a1' }
];

// Helper to lighten a hex color for jockey sleeve highlight
const lightenColor = (hex, percent = 25) => {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length < 7) return hex;
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.floor(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * (percent / 100)));
    const g = Math.min(255, Math.floor(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * (percent / 100)));
    const b = Math.min(255, Math.floor((num & 255) + (255 - (num & 255)) * (percent / 100)));
    return `rgb(${r}, ${g}, ${b})`;
};

// Helper to extract primary, sleeve, and cap colors from a silks Image using colorthief
export const extractSilksColors = (img, fallbackColor) => {
    const fallback = fallbackColor || '#4363d8';
    if (!img || !img.complete || img.naturalWidth === 0) {
        console.log('fallback on silk colours');
        return {
            shirtCol: fallback,
            sleeveCol: lightenColor(fallback, 28),
            capCol: fallback
        };
    }

    try {
        const palette = getPaletteSync(img, { colorCount: 4, quality: 5 });
        if (palette && palette.length > 0) {
            const shirtCol = palette[0].hex();
            const sleeveCol = palette[1] ? palette[1].hex() : lightenColor(shirtCol, 28);
            const capCol = palette[2] ? palette[2].hex() : (palette[1] ? palette[1].hex() : shirtCol);
            return { shirtCol, sleeveCol, capCol };
        }
    } catch {
        // Fall back gracefully if canvas is tainted by CORS or image invalid
        console.log('fallback on silk colours CATCH');
    }

    return {
        shirtCol: fallback,
        sleeveCol: lightenColor(fallback, 28),
        capCol: fallback
    };
};

// Generates a tinted HTMLImageElement from raw SVG with horse coat and jockey silks colors
export const createTintedHorseSvg = (rawSvg, coat, silksColors) => {
    const coatBody = coat?.body || HORSE_COAT_COLORS.bay.body;
    const coatLeg = coat?.leg || coat?.body || HORSE_COAT_COLORS.bay.body;
    const coatMane = coat?.mane || HORSE_COAT_COLORS.bay.mane;

    const { shirtCol, sleeveCol, capCol } = silksColors;

    const tinted = rawSvg
        // 1. Horse coat body, legs, mane
        .replace(/fill="#C1694F"/gi, `fill="${coatBody}"`)
        .replace(/fill="#8A4B38"/gi, `fill="${coatLeg}"`)
        .replace(/fill="#623120"/gi, `fill="${coatLeg}"`)
        .replace(/fill="#292F33"/gi, `fill="${coatMane}"`)
        // 2. Jockey shirt, sleeve highlight, cap, and blinkers with the silks color
        .replace(/fill="#5C913B"/gi, `fill="${shirtCol}"`)
        .replace(/fill="#A6D388"/gi, `fill="${sleeveCol}"`)
        .replace(/fill="#9266CC"/gi, `fill="${capCol}"`);

    const blob = new Blob([tinted], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tintedImg = new Image();
    tintedImg.src = url;
    return tintedImg;
};

// Helper to parse horse coat color from breeding string (e.g. "gelding b", "gelding ch", "filly gr")
export const parseBreedingColor = (breedingStr) => {
    if (!breedingStr || typeof breedingStr !== 'string') {
        return HORSE_COAT_COLORS.bay;
    }
    const clean = breedingStr.toLowerCase().trim();
    const tokens = clean.split(/[\s,/]+/).filter(Boolean);

    // 1. Exact token matching
    for (const token of tokens) {
        if (token === 'gr' || token === 'grey' || token === 'gray' || token === 'ro' || token === 'roan' || token === 'g') {
            return HORSE_COAT_COLORS.grey;
        }
        if (token === 'ch' || token === 'chesnut' || token === 'chestnut' || token === 'sorrel') {
            return HORSE_COAT_COLORS.chestnut;
        }
        if (token === 'bl' || token === 'black' || token === 'blk') {
            return HORSE_COAT_COLORS.black;
        }
        if (token === 'br' || token === 'brown') {
            return HORSE_COAT_COLORS.brown;
        }
        if (token === 'b' || token === 'bay') {
            return HORSE_COAT_COLORS.bay;
        }
    }

    // 2. Substring fallback
    if (/\b(gr|grey|gray|roan)\b/.test(clean)) return HORSE_COAT_COLORS.grey;
    if (/\b(ch|chestnut|chesnut)\b/.test(clean)) return HORSE_COAT_COLORS.chestnut;
    if (/\b(bl|black|blk)\b/.test(clean)) return HORSE_COAT_COLORS.black;
    if (/\b(br|brown)\b/.test(clean)) return HORSE_COAT_COLORS.brown;
    if (/\b(b|bay)\b/.test(clean)) return HORSE_COAT_COLORS.bay;

    return HORSE_COAT_COLORS.bay;
};

// Helper to parse numeric draw value (e.g. "3", 3, "(3)")
export const parseDraw = (draw) => {
    if (draw === null || draw === undefined || draw === '') return null;
    const num = parseInt(String(draw).replace(/\D/g, ''), 10);
    return isNaN(num) ? null : num;
};

// Computes responsive layout sizing & positions based on lane height
// Scales smoothly between tight fields (18-20+ runners, ~22px lanes) and small fields (2-5 runners, up to ~150px lanes)
export const getSimulatorLayout = (laneHeight) => {
    // 1. Horse size: fits ~20px in tight 19+ runner fields, scales up to ~74px in spacious 3-runner fields
    const maxHorseForLane = Math.max(24, Math.round(laneHeight * 0.95)); // Allows horse to fill almost the entire lane height
    const targetSize = Math.round(laneHeight * 0.80 + 10);              // Aggressive 80% scaling curve + higher base padding

    // Restrict size between a 24px floor (so tiny fields are readable) and a 150px ceiling
    const horseSize = Math.max(24, Math.min(150, maxHorseForLane, targetSize));
    const horseRadius = horseSize / 2;

    // 2. Silks icon size: 16px up to 48px
    const maxSilksForLane = Math.max(14, Math.round(laneHeight * 0.72));
    const silksSize = Math.max(16, Math.min(48, Math.min(maxSilksForLane, Math.round(laneHeight * 0.34 + 9))));

    // 3. Saddle cloth & stall draw font size: 10px up to 22px
    const numberFontSize = Math.max(10, Math.min(22, Math.round(laneHeight * 0.16 + 7)));

    // 4. Horse name & odds label font size: 10px up to 16px
    const labelFontSize = Math.max(10, Math.min(16, Math.round(laneHeight * 0.10 + 7.5)));

    // 5. Horizontal offsets (prevent overlaps regardless of scale)
    const numberX = Math.max(10, Math.min(16, Math.round(numberFontSize * 0.8)));
    // Width reserved for number + draw string (e.g. "12 (14)")
    const numDrawWidth = Math.round(numberFontSize * 3.4);
    const silksX = numberX + Math.max(46, numDrawWidth);
    const startX = silksX + silksSize + horseRadius + 14;

    return {
        horseSize,
        horseRadius,
        silksSize,
        numberFontSize,
        labelFontSize,
        numberX,
        silksX,
        startX
    };
};

// Default fallback field if no race/horses are passed
const DEFAULT_TURF_FIELD = [
    { id: 1, name: "Diamond Necklace", number: 1, breeding: "gelding ch", past: [{ name: "92" }, { name: "95" }, { name: "94" }] },
    { id: 2, name: "Bay City Roller", number: 2, breeding: "gelding b", past: [{ name: "99" }, { name: "82" }, { name: "84" }] },
    { id: 3, name: "Benvenuto Cellini", number: 3, breeding: "colt gr", past: [{ name: "85" }, { name: "105" }, { name: "88" }] },
    { id: 4, name: "Burnham Square", number: 4, breeding: "gelding bl", past: [{ name: "88" }, { name: "90" }, { name: "89" }] },
    { id: 5, name: "Ethical Diamond", number: 5, breeding: "gelding br", past: [{ name: "86" }, { name: "88" }, { name: "87" }] },
    { id: 6, name: "Tiffany", number: 6, breeding: "filly gr", past: [{ name: "84" }, { name: "85" }, { name: "86" }] },
    { id: 7, name: "Johanna Walsh", number: 7, breeding: "mare b", past: [{ name: "83" }, { name: "84" }, { name: "85" }] },
    { id: 8, name: "Bay Bridge", number: 8, breeding: "horse b", past: [{ name: "82" }, { name: "83" }, { name: "84" }] },
    { id: 9, name: "El Cordobes", number: 9, breeding: "gelding ch", past: [{ name: "80" }, { name: "82" }, { name: "81" }] },
    { id: 10, name: "Hotazhell", number: 10, breeding: "colt bl", past: [{ name: "79" }, { name: "80" }, { name: "82" }] },
    { id: 11, name: "Minaret Station", number: 11, breeding: "gelding b", past: [{ name: "78" }, { name: "79" }, { name: "80" }] },
    { id: 12, name: "Survie", number: 12, breeding: "filly ch", past: [{ name: "77" }, { name: "78" }, { name: "79" }] },
    { id: 13, name: "Far Bridge", number: 13, breeding: "gelding b", past: [{ name: "75" }, { name: "77" }, { name: "76" }] },
    { id: 14, name: "Deep Monster", number: 14, breeding: "horse bl", past: [{ name: "72" }, { name: "74" }, { name: "73" }] }
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
    const silksImagesRef = useRef(new Map());
    const defaultHorseImgRef = useRef(null);
    const horseSvgCacheRef = useRef(new Map());
    const silksColorsRef = useRef(new Map());
    const rawHorseSvgRef = useRef(null);

    const [raceState, setRaceState] = useState('ready'); // ready, racing, finished
    const [statusMessage, setStatusMessage] = useState('');
    const [showResultModal, setShowResultModal] = useState(false);
    const [resultStandings, setResultStandings] = useState([]);

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

        // 2. Extract the 3 key rating metrics and breeding coat color for each horse
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

            const originalIndex = rawList ? rawList.indexOf(h) : index;
            const colorIndex = originalIndex >= 0 ? originalIndex : index;
            const horseColor = h.color || LINE_COLORS[colorIndex % LINE_COLORS.length];

            // Horse coat color derived from breeding property
            const coat = parseBreedingColor(h.breeding);

            return {
                id: h.id ?? h.number ?? (index + 1),
                number: h.number ?? (index + 1),
                name: h.name || `Horse ${index + 1}`,
                draw: h.draw,
                jockey: h.jockey,
                trainer: h.trainer,
                silks: h.silks || null,
                coat,
                latestOdds: oddsInfo?.display || null,
                color: horseColor,
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

        // Order the simulator rows/lanes by stall draw if draw data exists
        const hasAnyDraw = processed.some(h => parseDraw(h.draw) !== null);
        if (hasAnyDraw) {
            processed.sort((a, b) => {
                const drawA = parseDraw(a.draw);
                const drawB = parseDraw(b.draw);

                if (drawA !== null && drawB !== null) {
                    if (drawA !== drawB) return drawA - drawB;
                    return a.rawIndex - b.rawIndex;
                }
                if (drawA !== null) return -1;
                if (drawB !== null) return 1;
                return a.rawIndex - b.rawIndex;
            });
        }

        return processed;
    }, [race, horses, time, place, pendingNonRunners, approvedNonRunners, rejectedNonRunners]);

    // Preload silks images asynchronously, extract palette via colorthief, and cache tinted horse SVGs
    useEffect(() => {
        fieldData.forEach((h) => {
            if (h.silks && !silksImagesRef.current.has(h.silks)) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = h.silks;
                img.onload = () => {
                    silksImagesRef.current.set(h.silks, img);

                    // Extract colors with colorthief
                    const silksColors = extractSilksColors(img, h.color);
                    silksColorsRef.current.set(h.silks, silksColors);

                    // If raw horse.svg has already been fetched, generate/update tinted variant
                    if (rawHorseSvgRef.current) {
                        const cacheKey = `${h.id}_${h.coat?.code || 'b'}_${h.color}`;
                        const coat = h.coat || HORSE_COAT_COLORS.bay;
                        const tintedImg = createTintedHorseSvg(rawHorseSvgRef.current, coat, silksColors);
                        tintedImg.onload = () => {
                            horseSvgCacheRef.current.set(cacheKey, tintedImg);
                            if (canvasRef.current && (raceState === 'ready' || raceState === 'finished')) {
                                const ctx = canvasRef.current.getContext('2d');
                                drawTrackAndField(ctx, canvasRef.current.width, canvasRef.current.height);
                            }
                        };
                    } else if (canvasRef.current && (raceState === 'ready' || raceState === 'finished')) {
                        const ctx = canvasRef.current.getContext('2d');
                        drawTrackAndField(ctx, canvasRef.current.width, canvasRef.current.height);
                    }
                };
                img.onerror = () => {
                    silksImagesRef.current.set(h.silks, null);
                };
            }
        });
    }, [fieldData, raceState]);

    // Preload horse.svg from public folder and generate coat & jockey-silks tinted variants
    useEffect(() => {
        const svgUrl = `${import.meta.env.BASE_URL}horse.svg`;

        const img = new Image();
        img.src = svgUrl;
        img.onload = () => {
            defaultHorseImgRef.current = img;
            if (canvasRef.current && (raceState === 'ready' || raceState === 'finished')) {
                const ctx = canvasRef.current.getContext('2d');
                drawTrackAndField(ctx, canvasRef.current.width, canvasRef.current.height);
            }
        };

        // Fetch raw SVG to generate coat color + jockey silks color variants for each horse
        fetch(svgUrl)
            .then(res => res.text())
            .then(rawSvg => {
                rawHorseSvgRef.current = rawSvg;

                fieldData.forEach((h) => {
                    const cacheKey = `${h.id}_${h.coat?.code || 'b'}_${h.color}`;
                    // If an image with extracted silks is already in cache, keep it
                    if (horseSvgCacheRef.current.has(cacheKey) && silksColorsRef.current.has(h.silks)) return;

                    const coat = h.coat || HORSE_COAT_COLORS.bay;
                    let silksColors = h.silks ? silksColorsRef.current.get(h.silks) : null;
                    if (!silksColors && h.silks && silksImagesRef.current.get(h.silks)) {
                        silksColors = extractSilksColors(silksImagesRef.current.get(h.silks), h.color);
                        silksColorsRef.current.set(h.silks, silksColors);
                    }
                    if (!silksColors) {
                        const silksCol = h.color || '#4363d8';
                        silksColors = {
                            shirtCol: silksCol,
                            sleeveCol: lightenColor(silksCol, 28),
                            capCol: silksCol
                        };
                    }

                    const tintedImg = createTintedHorseSvg(rawSvg, coat, silksColors);
                    tintedImg.onload = () => {
                        horseSvgCacheRef.current.set(cacheKey, tintedImg);
                        if (canvasRef.current && (raceState === 'ready' || raceState === 'finished')) {
                            const ctx = canvasRef.current.getContext('2d');
                            drawTrackAndField(ctx, canvasRef.current.width, canvasRef.current.height);
                        }
                    };
                });
            })
            .catch(() => { });
    }, [fieldData, raceState]);

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
        const layout = getSimulatorLayout(laneHeight);

        horsesRef.current = fieldData.map((data, index) => ({
            ...data,
            x: layout.startX,
            y: index * laneHeight + laneHeight / 2,
            horseSize: layout.horseSize
        }));
    };

    // Dedicated function to render the horse using public/horse.svg
    const drawHorse = (ctx, x, y, size, coat, horse) => {
        const cacheKey = horse ? `${horse.id}_${horse.coat?.code || 'b'}_${horse.color}` : null;
        const img = (cacheKey && horseSvgCacheRef.current.get(cacheKey)) || (coat?.code && horseSvgCacheRef.current.get(coat.code)) || defaultHorseImgRef.current;
        const horseSize = size || 34;

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.translate(x, y);
            // In horse.svg the horse faces left; scale(-1, 1) flips it so it faces right towards the finish line
            ctx.scale(-1, 1);
            ctx.drawImage(img, -horseSize / 2, -horseSize / 2, horseSize, horseSize);
            ctx.restore();
        }
    };

    // Dedicated Render Engine
    const drawTrackAndField = (ctx, width, height) => {
        ctx.clearRect(0, 0, width, height);
        const count = horsesRef.current.length || 1;
        const laneHeight = height / count;
        const layout = getSimulatorLayout(laneHeight);
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

            // Saddle cloth number & stall draw at lane start
            ctx.fillStyle = "#f1c40f";
            ctx.font = `bold ${layout.numberFontSize}px Arial`;
            const drawVal = horse.draw != null && horse.draw !== ''
                ? String(horse.draw).replace(/[()]/g, '').trim()
                : '';
            const numDrawText = drawVal ? `${horse.number ?? (index + 1)} (${drawVal})` : `${horse.number ?? (index + 1)}`;
            ctx.fillText(numDrawText, layout.numberX, currentY + laneHeight / 2 + layout.numberFontSize * 0.35);

            // Silks shown next to the number on the simulated race
            const silksImg = horse.silks ? silksImagesRef.current.get(horse.silks) : null;
            if (silksImg) {
                const silksH = layout.silksSize;
                const silksW = silksH;
                const silksY = currentY + (laneHeight - silksH) / 2;
                ctx.drawImage(silksImg, layout.silksX, silksY, silksW, silksH);
            }
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
            // Draw the horse itself in its breeding coat color and jockey with silks color
            drawHorse(ctx, horse.x, horse.y, layout.horseSize, horse.coat, horse);

            // Name & Ratings label
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${layout.labelFontSize}px Arial`;

            const oddsStr = horse.latestOdds ? ` (${horse.latestOdds})` : '';
            ctx.fillText(`${horse.name}${oddsStr}`, horse.x + (layout.horseSize / 2) + 8, horse.y + layout.labelFontSize * 0.35);
        });
    };

    // Physics Loop Manager: Strictly controlled rating speed engine
    const updateRaceFrame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const count = horsesRef.current.length || 1;
        const laneHeight = canvas.height / count;
        const layout = getSimulatorLayout(laneHeight);

        const finishLineX = canvas.width - (canvas.width > 600 ? 160 : 110);
        const startX = layout.startX;
        const totalDistance = finishLineX - startX;

        const raceDurationMs = 5000; // 5s full race
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
        if (tau < 0.40 && leaders.recent) {
            setStatusMessage(`Off! #${leaders.recent.number} ${leaders.recent.name} leads out best.`);
        } else if (tau >= 0.40 && tau < 0.80 && leaders.best) {
            setStatusMessage(`Midway! #${leaders.best.number} ${leaders.best.name} surges ahead midway through.`);
        } else if (tau >= 0.80 && tau < 1.0 && leaders.avg3) {
            setStatusMessage(`Home Straight! #${leaders.avg3.number} ${leaders.avg3.name} powering on with to win?`);
        }

        if (tau >= 1.0) {
            cancelAnimationFrame(requestRef.current);
            setRaceState('finished');

            // Sort horses by finish line progress (horse.x), breaking ties by avg3Score and avg3Rating
            const standings = [...horsesRef.current].sort((a, b) => {
                if (b.x !== a.x) return b.x - a.x;
                if (b.avg3Score !== a.avg3Score) return b.avg3Score - a.avg3Score;
                return (b.avg3Rating || 0) - (a.avg3Rating || 0);
            });

            const raceDetailText = race?.detail || race?.name || raceTitle || '';
            const resultMsg = formatRaceResult(standings, raceDetailText);
            setStatusMessage(resultMsg);
            setResultStandings(standings);
            setShowResultModal(true);
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
            const layout = getSimulatorLayout(laneHeight);

            horsesRef.current.forEach((horse, index) => {
                horse.y = index * laneHeight + laneHeight / 2;
                horse.horseSize = layout.horseSize;
                if (raceState === 'ready') {
                    horse.x = layout.startX;
                }
            });

            drawTrackAndField(ctx, width, height);
        };

        const initialWidth = container.clientWidth || 800;
        const initialHeight = container.clientHeight ? Math.max(container.clientHeight - 50, 300) : 450;
        initHorses(initialWidth, initialHeight);
        handleResize();
        setRaceState('ready');
        setShowResultModal(false);
        setResultStandings([]);
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
            setShowResultModal(false);
            setResultStandings([]);
            setStatusMessage(`${raceTitle} • Ready to Run`);
        } else {
            setShowResultModal(false);
            setRaceState('racing');
            startTimeRef.current = performance.now();
            requestRef.current = requestAnimationFrame(updateRaceFrame);
        }
    };

    const currentDetailText = race?.detail || race?.name || raceTitle || '';
    const announcedCount = resultStandings.length > 0
        ? Math.min(getAnnouncedPlacesCount(resultStandings.length, currentDetailText), resultStandings.length)
        : 0;
    const placedHorses = resultStandings.slice(0, announcedCount);

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
                        {raceState === 'finished' ? 'Reset' : raceState === 'racing' ? 'Racing...' : 'Start'}
                    </button>

                    {raceState === 'finished' && !showResultModal && (
                        <button
                            onClick={() => setShowResultModal(true)}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                backgroundColor: 'rgba(241, 196, 15, 0.18)',
                                color: '#f1c40f',
                                border: '1px solid #f1c40f',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span>🏆</span>
                            <span>Result</span>
                        </button>
                    )}
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

            {/* Official Result Splash Popup */}
            <AnimatePresence>
                {showResultModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowResultModal(false)}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(4, 15, 8, 0.82)',
                            backdropFilter: 'blur(5px)',
                            WebkitBackdropFilter: 'blur(5px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 40,
                            padding: '16px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.88, y: 25, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.88, y: 25, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: '500px',
                                background: 'linear-gradient(160deg, #0e301d 0%, #06180e 100%)',
                                border: '2px solid #f1c40f',
                                borderRadius: '14px',
                                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(241, 196, 15, 0.25)',
                                padding: '22px 24px',
                                color: '#ffffff'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '24px' }}>🏆</span>
                                        <h3 style={{
                                            margin: 0,
                                            color: '#f1c40f',
                                            fontSize: '19px',
                                            fontWeight: '900',
                                            letterSpacing: '1px',
                                            textTransform: 'uppercase'
                                        }}>
                                            Official Result
                                        </h3>
                                    </div>
                                    <div style={{ color: '#cbd5e1', fontSize: '12.5px', marginTop: '4px', fontWeight: '500' }}>
                                        {raceTitle}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowResultModal(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        fontSize: '26px',
                                        cursor: 'pointer',
                                        padding: '0 4px',
                                        lineHeight: 1
                                    }}
                                    title="Close"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Placed Horses List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {placedHorses.map((horse, idx) => {
                                    const config = RESULT_POSITION_CONFIG[idx] || RESULT_POSITION_CONFIG[3];
                                    return (
                                        <div
                                            key={horse.id ?? idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '10px 14px',
                                                backgroundColor: idx === 0 ? 'rgba(241, 196, 15, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                                                border: idx === 0 ? '1px solid rgba(241, 196, 15, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '8px',
                                                gap: '12px'
                                            }}
                                        >
                                            <div style={{
                                                background: config.bg,
                                                color: config.color,
                                                border: `1px solid ${config.border}`,
                                                borderRadius: '6px',
                                                padding: '3px 8px',
                                                fontWeight: '900',
                                                fontSize: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                minWidth: '56px',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                            }}>
                                                <span>{config.medal}</span>
                                                <span>{config.label}</span>
                                            </div>

                                            {horse.silks && (
                                                <img
                                                    src={horse.silks}
                                                    alt="silks"
                                                    style={{ width: '30px', height: '30px', objectFit: 'contain', flexShrink: 0 }}
                                                />
                                            )}

                                            <div style={{
                                                color: '#f1c40f',
                                                fontWeight: 'bold',
                                                fontSize: '14px',
                                                minWidth: '28px',
                                                textAlign: 'center'
                                            }}>
                                                {horse.number}{horse.draw ? <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '3px' }}>({horse.draw})</span> : ''}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: 'bold',
                                                    fontSize: '14px',
                                                    color: '#ffffff',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {horse.name}
                                                </div>
                                                {(horse.jockey || horse.trainer) && (
                                                    <div style={{
                                                        fontSize: '11px',
                                                        color: '#94a3b8',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {horse.jockey && `J: ${horse.jockey}`}
                                                        {horse.jockey && horse.trainer && ' • '}
                                                        {horse.trainer && `T: ${horse.trainer}`}
                                                    </div>
                                                )}
                                            </div>

                                            {horse.latestOdds && (
                                                <div style={{
                                                    backgroundColor: 'rgba(241, 196, 15, 0.15)',
                                                    border: '1px solid rgba(241, 196, 15, 0.4)',
                                                    color: '#f1c40f',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    flexShrink: 0
                                                }}>
                                                    {horse.latestOdds}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actions Footer */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button
                                    onClick={() => setShowResultModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '9px 14px',
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        color: '#cbd5e1',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                >
                                    Inspect Track Photo
                                </button>
                                <button
                                    onClick={handleControlClick}
                                    style={{
                                        flex: 1,
                                        padding: '9px 14px',
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        backgroundColor: '#f1c40f',
                                        color: '#114b29',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                        transition: 'opacity 0.2s ease'
                                    }}
                                >
                                    Reset
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
