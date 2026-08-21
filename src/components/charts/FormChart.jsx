import React, { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LINE_COLORS } from '../../constants/chartConstants';
import '../../css/FormChart.css';
import { useStore } from '../../store/alarmStore';

const CustomDot = React.memo((props) => {
  const { cx, cy, stroke, payload, dataKey, onNodeClick } = props;
  const isHighest = payload[`${dataKey}_isHighest`];
  const isWin = payload[`${dataKey}_isWin`];
  const isSameDist = payload[`${dataKey}_isSameDist`];

  return (
    <g onClick={() => onNodeClick && onNodeClick(payload, dataKey)} style={{ cursor: 'pointer' }}>
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      {isWin ? (
        <text
          x={cx}
          y={cy - (isSameDist ? 2 : 1)} // Adjusted Y to visually center symbols
          fill={stroke}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={isSameDist ? 24 : 16}
        >★</text>
      ) : (
        <circle cx={cx} cy={cy} r={3} fill={stroke} stroke={stroke} strokeWidth={1} />
      )}
      {isHighest && (
        <text x={cx} y={cy - 15} fill={stroke} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold">
          {`${dataKey} ${payload[`${dataKey}_latestOdds`]}`}
        </text>
      )}
    </g>
  );
});

const FormChart = ({ horses, onNext, onPrev, hasNext, hasPrev, todayDistance, todayGoing, raceTime, racePlace, viewMode }) => {
  const parseDistanceToFurlongs = (distStr) => {
    if (!distStr || typeof distStr !== 'string') return 0;
    let totalFurlongs = 0;

    const mMatch = distStr.match(/(\d+)m/);
    const fMatch = distStr.match(/(\d+)f/);
    const yMatch = distStr.match(/(\d+)y/);

    if (mMatch) totalFurlongs += parseInt(mMatch[1], 10) * 8;
    if (fMatch) totalFurlongs += parseInt(fMatch[1], 10);


    if (yMatch) {
      const yards = parseInt(yMatch[1], 10);
      totalFurlongs += Math.round(yards / 220); // Round to nearest furlong
    }
    return totalFurlongs;
  };

  const formatFurlongsToMiles = (furlongsStr) => {
    if (!furlongsStr || typeof furlongsStr !== 'string' || !furlongsStr.endsWith('f')) {
      return furlongsStr;
    }
    const furlongs = parseInt(furlongsStr.slice(0, -1), 10);
    if (isNaN(furlongs)) return furlongsStr;

    const miles = Math.floor(furlongs / 8);
    const remainingFurlongs = furlongs % 8;

    let result = '';
    if (miles > 0) result += `${miles}m`;
    if (remainingFurlongs > 0) {
      result += (result ? ' ' : '') + `${remainingFurlongs}f`;
    }
    return result || (furlongs === 0 ? '0f' : furlongsStr);
  };

  const [selectedHorse, setSelectedHorse] = useState([]);
  const [panelData, setPanelData] = useState(null);

  const handleNodeClick = (payload, horseName) => {
    setPanelData({
      horse: horseName,
      url: payload[`${horseName}_url`],
      silks: payload[`${horseName}_silks`],
      number: payload[`${horseName}_number`],
      owner: payload[`${horseName}_owner`],
      breeding: payload[`${horseName}_breeding`],
      foaled: payload[`${horseName}_foaled`],
      jockey: payload[`${horseName}_jockey`]
    });
  };

  const [top2Only, setTop2Only] = useState(false);
  const [positionFilter, setPositionFilter] = useState(0); // 0 = All, 1 = 1st, 2 = 1st or 2nd, etc.
  const [distanceBeatenFilter, setDistanceBeatenFilter] = useState(0); // 0 = All, 1 = within 1 length, etc.
  const [monthsFilter, setMonthsFilter] = useState(0); // 0 = All, 3-12 = months back
  const [distMargin, setDistMargin] = useState(-1); // -1 = All, 0 = Exact, 1-4 = furlong margin for race distance
  const [goingFilter, setGoingFilter] = useState(false);

  const aiMode = useStore((state) => state.aiMode);
  const toggleAi = useStore((state) => state.toggleAi);

  const getRating = (run) => {
    if (!run) return 0;
    const targetProperty = aiMode === 2 ? run.name2AI : aiMode === 1 ? run.nameAI : run.name;
    return Number(targetProperty) || 0;
  };

  // Clean up selection when moving between races to prevent "ghost" filters
  useEffect(() => {
    setSelectedHorse(prev => {
      const validNames = prev.filter(name => horses.some(h => h.name === name));
      // Only update state if the filtered list is actually different to avoid render loops
      return validNames.length === prev.length ? prev : validNames;
    });
  }, [horses]);

  // Synchronize the background scroll position with the race being navigated in the chart
  useEffect(() => {
    if (viewMode === 'all' && raceTime && racePlace) {
      const targetId = `${raceTime}${racePlace.replace(/\s+/g, '')}`;
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }
  }, [raceTime, racePlace, viewMode]);

  const chartData = useMemo(() => {
    const map = {};
    const horseMaxRatings = {};
    const horseEligibleRatings = {}; // To store ratings of races that pass filters for each horse
    const filteredHorses = selectedHorse.length === 0
      ? horses
      : horses.filter(h => selectedHorse.includes(h.name));

    // Calculate the cutoff date for the months filter
    let cutoffDate = null;
    if (monthsFilter > 0) {
      cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsFilter);
      cutoffDate.setHours(0, 0, 0, 0); // Normalize to start of day for consistent comparison
    }

    filteredHorses.forEach(horse => {
      // Initialize eligible ratings for the current horse
      horseEligibleRatings[horse.name] = [];

      // Skip non-runners
      const lastOdd = horse.odds?.[horse.odds.length - 1];
      if (lastOdd === "null" || lastOdd === "NR") return;

      const displayOdd = lastOdd === "null" ? "NR" : (lastOdd ? (isNaN(lastOdd) ? lastOdd : Number(lastOdd)) : "x");

      horse.past.forEach(race => {
        const posStr = race.position ? race.position.toString().trim() : "";
        const actualPos = parseInt(posStr.split('/')[0], 10); // Extract the finishing position as a number
        const isWinner = actualPos === 1;
        const todayFurlongs = parseDistanceToFurlongs(todayDistance); // Moved here to ensure it's available
        const raceFurlongs = parseDistanceToFurlongs(race.distance);
        const diff = Math.abs(raceFurlongs - todayFurlongs);
        const isSameDist = todayFurlongs > 0 && diff <= (distMargin === -1 ? 0 : distMargin);

        // Apply Position Filter
        if (positionFilter > 0 && (isNaN(actualPos) || actualPos > positionFilter)) {
          return; // Exclude if position filter is active and horse didn't meet it
        }

        // Apply Distance Beaten Filter
        if (distanceBeatenFilter > 0) {
          let meetsDistanceBeaten = false;
          if (isWinner) {
            meetsDistanceBeaten = true; // Winners are considered to have beaten by 0 lengths
          } else if (race.distBeaten) {
            const distStr = race.distBeaten.toLowerCase().trim();
            const abbreviations = ['shd', 'hd', 'nk', 'ns', 'dh'];
            if (abbreviations.includes(distStr)) {
              meetsDistanceBeaten = true; // Always include if it's an abbreviation for small margin
            } else {
              const distNum = parseFloat(distStr);
              if (!isNaN(distNum) && distNum <= distanceBeatenFilter) {
                meetsDistanceBeaten = true;
              }
            }
          }
          if (!meetsDistanceBeaten) {
            return;
          }
        }

        // Filter logic: Apply distance margin if active
        if (distMargin !== -1 && !isSameDist) {
          return;
        }

        // Apply Going Filter (Exact Match)
        if (goingFilter && todayGoing && race.going !== todayGoing) {
          return;
        }

        // Apply Weeks Filter: Skip races older than the selected timeframe
        const [d, m, y] = race.date.split('/');
        const raceDate = new Date(y, m - 1, d); // Month is 0-indexed
        raceDate.setHours(0, 0, 0, 0);

        if (cutoffDate && raceDate < cutoffDate) {
          return;
        }

        // If race passes all filters, add its rating to eligible ratings for this horse

        // 2. Select the rating field dynamically based on the button state

        horseEligibleRatings[horse.name].push(parseFloat(getRating(race)));

        const timestamp = new Date(y, m - 1, d).getTime();

        if (!map[timestamp]) map[timestamp] = { timestamp, date: race.date };

        map[timestamp][horse.name] = parseFloat(getRating(race));
        map[timestamp][`${horse.name}_todayWeight`] = horse.weight;
        map[timestamp][`${horse.name}_latestOdds`] = displayOdd;
        map[timestamp][`${horse.name}_isWin`] = isWinner;
        map[timestamp][`${horse.name}_isSameDist`] = isSameDist;
        map[timestamp][`${horse.name}_url`] = race.url;
        map[timestamp][`${horse.name}_silks`] = horse.silks;
        map[timestamp][`${horse.name}_number`] = horse.number;
        map[timestamp][`${horse.name}_owner`] = horse.owner;
        map[timestamp][`${horse.name}_breeding`] = horse.breeding;
        map[timestamp][`${horse.name}_foaled`] = horse.foaled;
        map[timestamp][`${horse.name}_jockey`] = horse.jockey;

        const beaten = race.distBeaten ? ` (${race.distBeaten} l)` : '';
        map[timestamp][`${horse.name}_details`] =
          `${race.time} ${race.course} (Class ${race.raceClass}, ${formatFurlongsToMiles(race.distance)}, ${race.going}) | ` +
          `Pos: ${race.position}${beaten} | Wt: ${race.weight} | ${horse.trainer}`;
      });
    });

    // After all races have been processed and filtered, determine the max rating from eligible races
    filteredHorses.forEach(horse => {
      const ratings = horseEligibleRatings[horse.name];
      horseMaxRatings[horse.name] = (ratings && ratings.length > 0) ? Math.max(...ratings) : -1;
    });

    const sortedData = Object.values(map).sort((a, b) => a.timestamp - b.timestamp);

    // Single-annotation pass: Mark only the chronologically first occurrence of the max rating
    const horseNames = Object.keys(horseMaxRatings);
    const annotatedHorses = new Set();

    sortedData.forEach(point => {
      horseNames.forEach(horseName => {
        if (point[horseName] === horseMaxRatings[horseName] && !annotatedHorses.has(horseName)) {
          point[`${horseName}_isHighest`] = true;
          annotatedHorses.add(horseName);
        }
      });
    });

    return sortedData; // Add weeksFilter to dependencies
  }, [horses, selectedHorse, positionFilter, distanceBeatenFilter, distMargin, todayDistance, monthsFilter, goingFilter, todayGoing, aiMode]);

  const CpuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
    </svg>
  );

  const ClaudeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a1 1 0 0 1 1 1v4.757l3.364-3.364a1 1 0 1 1 1.414 1.414L14.414 9H19a1 1 0 1 1 0 2h-4.757l3.364 3.364a1 1 0 0 1-1.414 1.414L13 12.414V17a1 1 0 1 1-2 0v-4.757l-3.364 3.364a1 1 0 0 1-1.414-1.414L9.586 11H5a1 1 0 1 1 0-2h4.757L6.393 5.636a1 1 0 0 1 1.414-1.414L11 7.586V3a1 1 0 0 1 1-1z" />
    </svg>
  );

  const ChatGptIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
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
    <div className="form-chart-container">
      <div className="chart-controls" style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          {hasPrev && (
            <button className="race-analytics-btn" onClick={onPrev}>
              ← Prev Race
            </button>
          )}
        </div>


        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Horse Selector */}
          <div className="hide-mobile" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '2px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            backgroundColor: selectedHorse.length > 0 ? 'var(--accent)' : 'transparent',
            color: selectedHorse.length > 0 ? 'var(--bg)' : 'var(--text)',
            fontSize: '13px'
          }}>
            <button
              onClick={() => {
                const allNames = horses
                  .filter(h => h.odds?.[h.odds.length - 1] !== "NR" && h.odds?.[h.odds.length - 1] !== "null")
                  .map(h => h.name);
                setSelectedHorse(selectedHorse.length === allNames.length ? [] : allNames);
              }}
              style={{
                background: 'none', border: 'none', color: 'inherit', cursor: 'pointer',
                fontSize: '11px', fontWeight: 'bold', borderRight: '1px solid currentColor',
                marginRight: '5px', paddingRight: '8px', whiteSpace: 'nowrap'
              }}
            >
              {selectedHorse.length > 0 ? 'Deselect' : 'All'}
            </button>
            <select
              multiple
              size={1}
              value={selectedHorse}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedHorse(values);
              }}
              style={{
                background: 'white',
                color: 'black',
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: selectedHorse.length > 0 ? 'bold' : 'normal'
              }}
            >
              {horses
                .filter(h => h.odds?.[h.odds.length - 1] !== "NR" && h.odds?.[h.odds.length - 1] !== "null")
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(h => (
                  <option key={h.name} value={h.name} style={{ color: LINE_COLORS[horses.indexOf(h) % LINE_COLORS.length] }}>{h.name}</option>
                ))}
            </select>
          </div>

          {/* Position Filter Slider */}
          <div className="hide-mobile" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '2px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            backgroundColor: positionFilter > 0 ? 'var(--accent)' : 'transparent',
            color: positionFilter > 0 ? 'var(--bg)' : 'var(--text)',
            fontSize: '13px'
          }}>
            <span style={{ whiteSpace: 'nowrap' }}>Pos: {positionFilter === 0 ? 'Off' : `${positionFilter}`}</span>
            <input
              type="range"
              min="0"
              max="5" // Max 5 positions, adjust as needed
              step="1"
              value={positionFilter}
              onChange={(e) => setPositionFilter(parseInt(e.target.value, 10))}
              style={{ width: '60px', cursor: 'pointer', accentColor: positionFilter > 0 ? 'var(--bg)' : 'var(--accent)' }}
            />
          </div>

          {/* Distance Beaten Filter Slider */}
          <div className="hide-mobile" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '2px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            backgroundColor: distanceBeatenFilter > 0 ? 'var(--accent)' : 'transparent',
            color: distanceBeatenFilter > 0 ? 'var(--bg)' : 'var(--text)',
            fontSize: '13px'
          }}>
            <span style={{ whiteSpace: 'nowrap' }}>Btn: {distanceBeatenFilter === 0 ? 'Off' : `<${distanceBeatenFilter}L`}</span>
            <input
              type="range"
              min="0"
              max="5" // Max 5 lengths, adjust as needed
              step="1"
              value={distanceBeatenFilter}
              onChange={(e) => setDistanceBeatenFilter(parseInt(e.target.value, 10))}
              style={{ width: '60px', cursor: 'pointer', accentColor: distanceBeatenFilter > 0 ? 'var(--bg)' : 'var(--accent)' }}
            />
          </div>

          {/* Existing Distance Margin Slider */}
          <div className="hide-mobile" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '2px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            backgroundColor: distMargin >= 0 ? 'var(--accent)' : 'transparent',
            color: distMargin >= 0 ? 'var(--bg)' : 'var(--text)',
            fontSize: '13px'
          }}>
            <span style={{ whiteSpace: 'nowrap' }}>Dist: {distMargin === -1 ? 'Off' : (distMargin === 0 ? '±0f' : `±${distMargin}f`)}</span>
            <input
              type="range"
              min="-1"
              max="4" // Max 4 furlongs margin, adjust as needed
              step="1"
              value={distMargin}
              onChange={(e) => setDistMargin(parseInt(e.target.value, 10))}
              style={{ width: '60px', cursor: 'pointer', accentColor: distMargin >= 0 ? 'var(--bg)' : 'var(--accent)' }}
            />
          </div>

          {/* Going Filter Toggle */}
          <div
            onClick={() => setGoingFilter(!goingFilter)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '2px 12px',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              backgroundColor: goingFilter ? 'var(--accent)' : 'transparent',
              color: goingFilter ? 'var(--bg)' : 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>{goingFilter ? todayGoing || 'Match' : 'Going'}</span>
          </div>

          {/* NEW: Months Filter Slider */}
          <div className="hide-mobile" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '2px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            backgroundColor: monthsFilter > 0 ? 'var(--accent)' : 'transparent',
            color: monthsFilter > 0 ? 'var(--bg)' : 'var(--text)',
            fontSize: '13px'
          }}>
            <span style={{ whiteSpace: 'nowrap' }}>Months: {monthsFilter === 0 ? 'Off' : `${monthsFilter}`}</span>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={monthsFilter === 0 ? 0 : (15 - monthsFilter) / 3}
              onChange={(e) => { const v = parseInt(e.target.value, 10); setMonthsFilter(v === 0 ? 0 : 15 - (v * 3)); }}
              style={{ width: '60px', cursor: 'pointer', accentColor: monthsFilter > 0 ? 'var(--bg)' : 'var(--accent)' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, textAlign: 'right' }}>
          <button
            onClick={() => toggleAi()}
            className="race-analytics-btn"
            title={currentConfig.title}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: currentConfig.color,
              color: 'white',
              padding: '4px 6px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
          >
            {currentConfig.icon}
          </button>

          {hasNext && (
            <button className="race-analytics-btn" onClick={onNext}>
              Next Race →
            </button>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(unixTime) => {
              const date = new Date(unixTime);
              const d = date.getDate();
              const m = date.toLocaleString('default', { month: 'short' });
              return `${d} ${m}`;
            }}
            tick={{ fill: 'var(--text)', fontSize: 12 }}
          />
          <YAxis
            domain={['auto', dataMax => Math.round(dataMax * 1.05)]}
            tick={{ fill: 'var(--text)', fontSize: 12 }}
            label={{ value: 'Rating', angle: -90, position: 'insideLeft', fill: 'var(--text)' }}
          />
          <Tooltip
            itemSorter={(item) => -item.value}
            separator=""
            labelFormatter={(label) => {
              if (isNaN(label)) return label;
              const date = new Date(label);
              return date.toLocaleDateString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric'
              });
            }}
            formatter={(value, name, entry) => {
              const details = entry.payload[`${name}_details`];
              const todayWeight = entry.payload[`${name}_todayWeight`];
              const latestOdds = entry.payload[`${name}_latestOdds`];
              if (!details) return [value, name];
              const [raceInfo, ...performance] = details.split(' | ');
              return [
                <span key={name} style={{ display: 'block' }}>
                  <span style={{ fontWeight: 'bold', display: 'block' }}>
                    <span style={{ color: entry.color }}>{name} {latestOdds}</span>
                    <span style={{ color: 'var(--text-h)' }}>{` (${todayWeight}) ${value}`}</span>
                  </span>
                  <span style={{ display: 'block' }}>{raceInfo}</span>
                  <span style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginTop: '2px' }}>{performance.join(' • ')}</span>
                </span>,
                ''
              ];
            }}
          />
          {horses
            .filter(h => selectedHorse.length === 0 || selectedHorse.includes(h.name))
            .map((horse, index) => (
              <Line
                key={horse.name}
                type="linear"
                dataKey={horse.name}
                stroke={LINE_COLORS[horses.indexOf(horse) % LINE_COLORS.length]}
                strokeWidth={2}
                dot={<CustomDot onNodeClick={handleNodeClick} />}
                connectNulls
              />
            ))}
        </LineChart>
      </ResponsiveContainer>

      {panelData && (
        <div className="chart-detail-panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {panelData.silks && (
                panelData.url ? (
                  <a href={panelData.url} target="_blank" rel="noopener noreferrer" title="View Race Result">
                    <img src={panelData.silks} alt="silks" style={{ height: '24px', marginRight: '10px', cursor: 'pointer' }} />
                  </a>
                ) : (
                  <img src={panelData.silks} alt="silks" style={{ height: '24px', marginRight: '10px' }} />
                )
              )}
              <h4>{panelData.number ? `${panelData.number}. ` : ''}{panelData.horse}</h4>
            </div>
            <button onClick={() => setPanelData(null)} className="close-btn">×</button>
          </div>
          <div className="panel-content">
            <p><strong>Owner:</strong> {panelData.owner}</p>
            <p><strong>Breeding:</strong> {panelData.breeding}</p>
            <p><strong>Foaled:</strong> {panelData.foaled}</p>
            <p><strong>Jockey:</strong> {panelData.jockey}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormChart;