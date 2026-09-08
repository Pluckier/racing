import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Chart } from 'react-google-charts';
import '../../css/RaceTimeline.css';
import SkeletonRaceTimeline from '../skeletons/SkeletonRaceTimeline';
import { getFormEmoji } from '../../constants/chartConstants';

const ROW_HEIGHT = 35;    // per-row pixels (tweak for density)
const HEADER_HEIGHT = 50; // reserved top area (labels/header)

const wrapTextAtSpaces = (text, maxLength = 30) => {
  if (!text) return '';

  const words = text.trim().split(/\s+/).filter(Boolean);
  let lines = [];
  let currentLine = '';

  // Helper to accurately count visual characters (including complex emojis)
  const getVisualLength = (str) => {
    return [...new Intl.Segmenter().segment(str)].length;
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Handle individual words that are somehow longer than the max limit
    if (getVisualLength(word) > maxLength) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      lines.push(word);
      continue;
    }

    // Formulate what the line would look like if we add this word
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (getVisualLength(testLine) > maxLength) {
      // The test line is too long! Push what we have accumulated so far
      lines.push(currentLine);
      // Start the next fresh line with the current word
      currentLine = word;
    } else {
      // It fits perfectly, continue accumulating the line
      currentLine = testLine;
    }
  }

  // Push the final remaining line if it exists
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join('<br/>');
};


const RaceTimeline = ({ races = [], theme: currentTheme, currentDateStr }) => {
  const containerRef = useRef(null);
  const hasMeasured = useRef(false);
  const validRaceIndexMapRef = useRef([]); // maps chart row -> original races index

  const minTimeRef = useRef(null);
  const maxTimeRef = useRef(null);


  // Build rows and find global min/max times (only from validated rows)
  let globalMinTime = null;
  let globalMaxTime = null;

  const rows = useMemo(() => {
    const result = [];
    const localValidMap = [];

    let localMin = null;
    let localMax = null;

    races.forEach((race, idx) => {
      // Validate time format strictly: "H:MM" or "HH:MM"
      const timeStr = race?.time;
      if (!timeStr || typeof timeStr !== 'string') return;
      const timeMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) return;

      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return;

      // Extract distance from detail (e.g., "2m 4f", "5f") to determine duration
      const milesMatch = race.detail?.match(/(\d+)m/);
      const furlongsMatch = race.detail?.match(/(\d+)f/);
      const m = milesMatch ? parseInt(milesMatch[1], 10) : 0;
      const f = furlongsMatch ? parseInt(furlongsMatch[1], 10) : 0;
      const totalMiles = m + f / 8;
      const duration = totalMiles > 0 ? 1.5 * totalMiles + 0.5 * Math.pow(totalMiles, 2) : 10;

      // Create base start/end anchored to year 0 (will be re-anchored later)
      const start = new Date(0, 0, 0, hours, minutes);
      const end = new Date(0, 0, 0, hours, minutes + Math.max(2, duration));

      // Update globals only for validated dates
      if (!localMin || start < localMin) localMin = start;
      if (!localMax || end > localMax) localMax = end;

      const totalPastRuns =
        race.horses?.reduce((acc, horse) => acc + Math.min(horse.past?.length || 0, 6), 0) || 0;
      const maxPossibleRuns = (race.horses?.length || 0) * 6;
      const formPercentage = maxPossibleRuns > 0 ? Math.round((totalPastRuns / maxPossibleRuns) * 100) : 0;

      const d = (race.detail || '').toLowerCase();
      const isH = d.includes('handicap') || d.includes('nursery');
      const isC1 = d.includes('class 1') || d.includes('class 2');
      const count = race.horses?.length || 0;
      const icons = [];
      if (isC1) icons.push('👑');
      if (isH) icons.push('⚖️');
      if ((isH || isC1) && count >= 8) icons.push('🏆');
      const icon = icons.length ? icons.join(' ') : '🚫';

      const emoji = getFormEmoji(formPercentage);

      const rawFullDetail = `${race.detail || ''} (${race.runners || 0} run)`;
      const displayDetail = wrapTextAtSpaces(icon + " " + rawFullDetail + " FORM:" + formPercentage + "% " + emoji, 40);

      const themeStyle = currentTheme === 'dark'
        ? 'background-color: #595656; color: #ffffff; border: 1px solid #444;'
        : 'background-color: #ffffff; color: #333333; border: 1px solid #ccc;';

      const tooltipHtml = `<div style="padding:10px; min-width: 280px !important; width: max-content !important; font-family:sans-serif; font-size:13px; line-height:1.4; ${themeStyle}">${displayDetail}</div>`;

      localValidMap.push(idx);
      result.push([race.place, race.time, tooltipHtml, start, end]);
    });

    minTimeRef.current = localMin;
    maxTimeRef.current = localMax;

    // persist mapping so selection callback can map back to original races array
    validRaceIndexMapRef.current = localValidMap;
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [races, currentTheme]);

  // Build data and re-anchor rows to today's date context (and provide safe fallback)
  const data = useMemo(() => {
    const cols = [
      { type: 'string', id: 'Venue' },
      { type: 'string', id: 'Race' },
      { type: 'string', role: 'tooltip', p: { html: true } },
      { type: 'date', id: 'Start' },
      { type: 'date', id: 'End' },
    ];

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();

    const correctedRows = rows.map((row) => {
      if (!Array.isArray(row)) return row;

      const oldStart = row[3];
      const oldEnd = row[4];

      // Re-anchor hours and minutes to today's date if the original Date is valid
      const start = (oldStart instanceof Date && !isNaN(oldStart.getTime()))
        ? new Date(year, month, date, oldStart.getHours(), oldStart.getMinutes(), 0)
        : new Date(year, month, date, 0, 0, 0);

      const end = (oldEnd instanceof Date && !isNaN(oldEnd.getTime()))
        ? new Date(year, month, date, oldEnd.getHours(), oldEnd.getMinutes(), 0)
        : new Date(start.getTime() + 10 * 60000); // 10 min safe offset

      return [row[0], row[1], row[2], start, end];
    });

    return [cols, ...correctedRows];
  }, [rows]);

  // Deterministic wrapper height: calculate from validated rows
  const rowCount = new Set(rows.map((r) => r[0])).size || 0;
  const baselineWrapperHeight = HEADER_HEIGHT + rowCount * ROW_HEIGHT;

  // wrapper height in state so we can adjust after measurement if needed
  const [wrapperHeight, setWrapperHeight] = useState(baselineWrapperHeight);

  // measured chart area from Google Chart API (top,left,width,height) - pixels
  const [measuredChartArea, setMeasuredChartArea] = useState(null);

  // Track min/max time bounds and races count/identity so we re-measure when races are filtered
  const timeSignature = `${minTimeRef.current?.getTime() || 0}-${maxTimeRef.current?.getTime() || 0}-${races.length}`;

  // reset measurement when rowCount, races/time boundaries, or theme change
  useEffect(() => {
    hasMeasured.current = false;
    setMeasuredChartArea(null);
    setWrapperHeight(baselineWrapperHeight);

    // Clear the interval right away so old timers don't conflict
    if (window.timelineNowInterval) {
      clearInterval(window.timelineNowInterval);
    }

    // Remove the physical line element from view
    const container = containerRef.current;
    if (container) {
      const oldLine = container.querySelector('.timeline-now-line');
      if (oldLine) oldLine.remove();
    }
  }, [baselineWrapperHeight, rowCount, timeSignature, currentTheme]);


  // compute the chart options; once measuredChartArea exists we pass its pixel values to chartArea
  const options = useMemo(() => {
    const base = {
      timeline: {
        showRowLabels: true,
        groupByRowLabel: true,
        colorByRowLabel: true,
        rowLabelStyle: { fontSize: 12, color: currentTheme === 'dark' ? '#e0e0e0' : '#333333' },
        barLabelStyle: { fontSize: 10, color: currentTheme === 'dark' ? '#e0e0e0' : '#333333' },
      },
      tooltip: { isHtml: true },
      colors: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043'],
      backgroundColor: currentTheme === 'dark' ? '#2a2a2a' : '#ffffff',
      height: wrapperHeight,
    };
    if (measuredChartArea) {
      // pass exact pixels to prevent Google's internal scroll from happening
      return {
        ...base,
        chartArea: {
          top: measuredChartArea.top,
          left: measuredChartArea.left,
          width: measuredChartArea.width,
          height: measuredChartArea.height,
        },
      };
    }
    // no measured area yet — let chart compute area; we'll read it on ready
    return {
      ...base,
      chartArea: { top: HEADER_HEIGHT - 2 }, // small top offset hint
    };
  }, [measuredChartArea, wrapperHeight, currentTheme]);







  const renderNowIndicator = (chartArea) => {
    const chartDiv = containerRef.current;
    if (!chartDiv) {
      return;
    }

    // 1. Clear any previous intervals to avoid duplicate clocks
    if (window.timelineNowInterval) {
      clearInterval(window.timelineNowInterval);
    }

    // 2. Define the core drawing function
    const drawLine = () => {
      const oldLine = chartDiv.querySelector('.timeline-now-line');
      if (oldLine) oldLine.remove();

      // SAFETY GUARD: Abort cleanly if row parsing hasn't updated the timeline limits yet
      if (!minTimeRef.current || !maxTimeRef.current) {
        return;
      }

      const simulatedTime = new Date();
      simulatedTime.setHours(simulatedTime.getHours());

      const year = simulatedTime.getFullYear();
      const month = simulatedTime.getMonth();
      const date = simulatedTime.getDate();

      // Read from our new persistent reference hooks
      const chartStart = new Date(year, month, date, minTimeRef.current.getHours(), minTimeRef.current.getMinutes(), 0);
      const chartEnd = new Date(year, month, date, maxTimeRef.current.getHours(), maxTimeRef.current.getMinutes(), 0);

      const totalDuration = chartEnd.getTime() - chartStart.getTime();
      const timeElapsed = simulatedTime.getTime() - chartStart.getTime();
      const percentage = timeElapsed / totalDuration;

      if (percentage >= 0 && percentage <= 1) {
        const lineLeftPosition = chartArea.left + (chartArea.width * percentage);

        const line = document.createElement('div');
        line.className = 'timeline-now-line';

        const lineColor = currentTheme === 'dark' ? '#ffffff' : '#000000';
        const shadowColor = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';

        Object.assign(line.style, {
          position: 'absolute',
          left: `${lineLeftPosition}px`,
          top: `${chartArea.top}px`,
          height: `${chartArea.height}px`,
          width: '2px',
          opacity: '0.7',
          backgroundColor: lineColor,
          zIndex: '15',
          pointerEvents: 'none',
          boxShadow: `0 0 6px ${shadowColor}`
        });

        // 2. Create the Top Triangle (Pointing Downwards ▼)
        const topTriangle = document.createElement('div');
        Object.assign(topTriangle.style, {
          position: 'absolute',
          top: '-2px',                  // Sits just above the chart boundary grid
          left: '-4px',                 // Centers a 10px wide triangle on a 2px line
          width: '0',
          height: '0',
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: `6px solid ${lineColor}`, // Pointing Down
          pointerEvents: 'none'
        });
        line.appendChild(topTriangle);

        // 3. Create the Bottom Triangle (Pointing Upwards ▲)
        const bottomTriangle = document.createElement('div');
        Object.assign(bottomTriangle.style, {
          position: 'absolute',
          bottom: '-2px',               // Sits just below the chart boundary grid
          left: '-4px',                 // Centers a 10px wide triangle on a 2px line
          width: '0',
          height: '0',
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: `6px solid ${lineColor}`, // Pointing Up
          pointerEvents: 'none'
        });
        line.appendChild(bottomTriangle);

        chartDiv.appendChild(line);
      }
    };

    // 4. Run immediately and keep updating every minute
    drawLine();
    window.timelineNowInterval = setInterval(drawLine, 60000);
  };







  const handleChartReady = ({ chartWrapper }) => {
    if (hasMeasured.current) return;

    try {
      const container = containerRef.current;
      if (!container) return;

      const svgElement = container.querySelector('svg');
      if (!svgElement) return;

      // 1. Grab all rendered bars inside the timeline.
      // Google isolates timeline nodes using rect elements without borders.
      const rects = Array.from(svgElement.querySelectorAll('rect'));
      const svgBounds = svgElement.getBoundingClientRect();

      // 2. Identify the true timeline bars by ignoring wide background container blocks
      const dynamicBars = rects.filter(rect => {
        const w = parseFloat(rect.getAttribute('width') || '0');
        const x = parseFloat(rect.getAttribute('x') || '0');
        // A legitimate race block has a finite width and starts past the text margins
        return w > 2 && x > 20 && w < (svgBounds.width - 20);
      });

      if (dynamicBars.length === 0) return;

      // 3. Scan the exact visual limits from the drawn vector blocks themselves
      let minLeftEdge = Infinity;
      let maxRightEdge = 0;
      let minTopEdge = Infinity;
      let maxBottomEdge = 0;

      dynamicBars.forEach(bar => {
        const x = parseFloat(bar.getAttribute('x') || '0');
        const y = parseFloat(bar.getAttribute('y') || '0');
        const w = parseFloat(bar.getAttribute('width') || '0');
        const h = parseFloat(bar.getAttribute('height') || '0');

        if (x < minLeftEdge) minLeftEdge = x;
        if ((x + w) > maxRightEdge) maxRightEdge = x + w;
        if (y < minTopEdge) minTopEdge = y;
        if ((y + h) > maxBottomEdge) maxBottomEdge = y + h;
      });

      // 4. Calculate exact grid space bounding metrics
      const exactLeft = minLeftEdge + 6;
      const exactWidth = maxRightEdge - minLeftEdge + 10;
      const exactTop = minTopEdge;
      const exactHeight = maxBottomEdge + 12;

      // Strict validation check to ensure calculations succeeded
      if (exactLeft === Infinity || exactWidth <= 0) return;

      hasMeasured.current = true;

      const measured = {
        top: Math.round(exactTop),
        left: Math.round(exactLeft),
        width: Math.round(exactWidth),
        height: Math.round(exactHeight),
      };

      setMeasuredChartArea(measured);
      renderNowIndicator(measured);

    } catch (err) {

    }
  };

  // Build chartEvents: use ready to measure and keep select behavior
  const chartEvents = [
    {
      eventName: 'ready',
      callback: handleChartReady,
    },
    {
      eventName: 'select',
      callback: ({ chartWrapper }) => {
        try {
          const chart = chartWrapper.getChart();
          const selection = chart.getSelection();
          if (selection.length > 0) {
            const row = selection[0].row;
            const originalIdx = validRaceIndexMapRef.current && validRaceIndexMapRef.current[row];
            // If mapping exists, map back to the original races; otherwise fallback to same index
            const race = (typeof originalIdx === 'number') ? races[originalIdx] : races[row];
            if (race) {
              const raceId = `${race.time}${race.place.replace(/\s+/g, '')}`;
              window.location.hash = currentDateStr ? `${currentDateStr}@${raceId}` : raceId;
            }
          }
        } catch (e) {
          // ignore
        }
      },
    },
  ];

  // If there are no valid rows, render nothing
  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <div
      className="race-timeline-container"
      ref={containerRef}
      style={{ position: 'relative', height: `${wrapperHeight}px`, boxSizing: 'border-box', width: '100%' }}
    >
      <Chart
        chartType="Timeline"
        data={data}
        chartVersion="51"
        height={`${wrapperHeight}px`}
        width="100%"
        options={options}
        loader={<SkeletonRaceTimeline height={wrapperHeight} />}
        chartEvents={chartEvents}
      />

    </div>
  );
};

export default RaceTimeline;