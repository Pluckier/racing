import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Chart } from 'react-google-charts';
import '../../css/RaceTimeline.css';
import SkeletonRaceTimeline from '../skeletons/SkeletonRaceTimeline';

/**
 * RaceTimeline.jsx
 * - Deterministic wrapper height
 * - Single 'ready' measurement via getChartLayoutInterface().getChartAreaBoundingBox()
 * - Pixel chartArea applied after measurement
 * - Precise now-indicator positioning computed from measured chartArea
 */

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



const RaceTimeline = ({ races = [], theme: currentTheme }) => {
  const containerRef = useRef(null);
  const hasMeasured = useRef(false);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Build rows and find global min/max times
  let globalMinTime = null;
  let globalMaxTime = null;

  const rows = useMemo(() => {
    return races.map((race) => {
      const [hours, minutes] = (race.time || '00:00').split(':').map(Number);
      const milesMatch = race.detail?.match(/(\d+)m/);
      const furlongsMatch = race.detail?.match(/(\d+)f/);
      const m = milesMatch ? parseInt(milesMatch[1], 10) : 0;
      const f = furlongsMatch ? parseInt(furlongsMatch[1], 10) : 0;
      const totalMiles = m + f / 8;
      const duration = totalMiles > 0 ? 1.5 * totalMiles + 0.5 * Math.pow(totalMiles, 2) : 10;

      const start = new Date(0, 0, 0, hours, minutes);
      const end = new Date(0, 0, 0, hours, minutes + Math.max(2, duration));

      if (!globalMinTime || start < globalMinTime) globalMinTime = start;
      if (!globalMaxTime || end > globalMaxTime) globalMaxTime = end;

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

      const rawFullDetail = `${race.detail || ''} (${race.runners || 0} run)`;
      const displayDetail = wrapTextAtSpaces(icon + " " + rawFullDetail + " FORM:" + formPercentage + "%", 40);

      const tooltipHtml = `<div style="padding:10px; min-width: 280px !important; width: max-content !important; font-family:sans-serif; font-size:13px; line-height:1.4; ${currentTheme === 'dark' ? 'background:#595656;color:#fff;border:1px solid #444;' : 'background:#fff;color:#333;border:1px solid #ccc;'
        }">${displayDetail}</div>`;

      return [race.place, race.time, tooltipHtml, start, end];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [races, currentTheme]);

  const data = useMemo(() => {
    const cols = [
      { type: 'string', id: 'Venue' },
      { type: 'string', id: 'Race' },
      { type: 'string', role: 'tooltip', p: { html: true } },
      { type: 'date', id: 'Start' },
      { type: 'date', id: 'End' },
    ];

    // Map and correct the raw rows directly inside the hook calculation block
    const correctedRows = rows.map((row) => {
      if (!Array.isArray(row)) return row;

      const oldStart = row[3];
      const oldEnd = row[4];

      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const date = today.getDate();

      // Re-anchor hours and minutes smoothly to the current 2026 year context
      const start = (oldStart instanceof Date && !isNaN(oldStart))
        ? new Date(year, month, date, oldStart.getHours(), oldStart.getMinutes(), 0)
        : new Date();

      const end = (oldEnd instanceof Date && !isNaN(oldEnd))
        ? new Date(year, month, date, oldEnd.getHours(), oldEnd.getMinutes(), 0)
        : new Date(start.getTime() + 10 * 60000); // 10 min safe offset if zero or null

      return [row[0], row[1], row[2], start, end];
    });

    return [cols, ...correctedRows];
  }, [rows]);

  // Deterministic wrapper height
  const rowCount = new Set(races.map((r) => r.place)).size || 0;
  const baselineWrapperHeight = HEADER_HEIGHT + rowCount * ROW_HEIGHT;

  // wrapper height in state so we can adjust after measurement if needed
  const [wrapperHeight, setWrapperHeight] = useState(baselineWrapperHeight);

  // measured chart area from Google Chart API (top,left,width,height) - pixels
  const [measuredChartArea, setMeasuredChartArea] = useState(null);

  // reset measurement when rowCount changes so we re-measure
  useEffect(() => {
    hasMeasured.current = false;
    setMeasuredChartArea(null);
    setWrapperHeight(baselineWrapperHeight);
  }, [baselineWrapperHeight, rowCount]);

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

  // handle chart ready: measure chartArea ONCE
  const handleChartReady = ({ chartWrapper }) => {
    if (hasMeasured.current) return;
    try {
      const chart = chartWrapper.getChart();
      if (!chart || typeof chart.getChartLayoutInterface !== 'function') return;
      const cli = chart.getChartLayoutInterface();
      const box = cli.getChartAreaBoundingBox && cli.getChartAreaBoundingBox();
      if (!box) return;

      // box: { top, left, width, height } in pixels relative to chart area
      hasMeasured.current = true;
      const measured = {
        top: Math.round(box.top),
        left: Math.round(box.left),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
      setMeasuredChartArea(measured);

      // Adjust wrapperHeight to match plotted area + top + small bottom padding so no inner scroll
      const desiredWrapper = measured.top + measured.height + 6; // 6px bottom padding
      // only update if significantly different to avoid thrash
      if (Math.abs(desiredWrapper - wrapperHeight) > 6) {
        setWrapperHeight(desiredWrapper);
      }
    } catch (err) {
      // ignore chart not ready
      // console.warn('chart ready measurement failed', err);
    }
  };


  // compute now indicator left (percent). This uses measuredChartArea when available,
  // otherwise we fall back to a centered placeholder.
  const [nowLeftPercent, setNowLeftPercent] = useState(null);

  const recomputeNowLeft = () => {
    if (!measuredChartArea || !containerRef.current || !globalMinTime || !globalMaxTime) {
      setNowLeftPercent(null);
      return;
    }
    const containerWidth = containerRef.current.clientWidth || containerRef.current.getBoundingClientRect().width;
    const normalizedNow = new Date(0, 0, 0, now.getHours(), now.getMinutes());
    if (normalizedNow < globalMinTime || normalizedNow > globalMaxTime) {
      setNowLeftPercent(null);
      return;
    }
    const total = globalMaxTime.getTime() - globalMinTime.getTime();
    const elapsed = normalizedNow.getTime() - globalMinTime.getTime();
    const pct = elapsed / total; // 0..1
    const leftPx = measuredChartArea.left + pct * measuredChartArea.width;
    const leftPercent = (leftPx / containerWidth) * 100;
    setNowLeftPercent(Math.max(0, Math.min(100, leftPercent)));
  };

  // recompute when measured area, container size, or time changes
  useEffect(() => {
    recomputeNowLeft();
    const onResize = () => recomputeNowLeft();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuredChartArea, now, globalMinTime, globalMaxTime]);

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
            const race = races[row];
            if (race) {
              const raceId = `${race.time}${race.place.replace(/\s+/g, '')}`;
              window.location.hash = raceId;
            }
          }
        } catch (e) {
          // ignore
        }
      },
    },
  ];

  // Render now indicator (pixel-accurate height taken from measuredChartArea.height)
  const renderNowIndicator = () => {
    if (nowLeftPercent == null) return null;
    const top = measuredChartArea ? measuredChartArea.top : HEADER_HEIGHT;
    const height = measuredChartArea ? measuredChartArea.height : Math.max(40, wrapperHeight - HEADER_HEIGHT);
    const color = currentTheme === 'dark' ? '#ffffff' : '#000000';
    return (
      <div
        className="timeline-now-indicator"
        data-testid="now-indicator"
        style={{
          position: 'absolute',
          left: `${nowLeftPercent}%`,
          top: `${top}px`,
          height: `${height}px`,
          width: '2px',
          backgroundColor: color,
          zIndex: 60,
          pointerEvents: 'none',
          transform: 'translateX(-50%)', // center the 2px line at the computed point
        }}
      >
        {/* top triangle */}
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '-5px',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `10px solid ${color}`,
          }}
        />
        {/* bottom triangle */}
        <div
          style={{
            position: 'absolute',
            top: `${height}px`,
            left: '-5px',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: `10px solid ${color}`,
          }}
        />
      </div>
    );
  };

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

      {renderNowIndicator()}
    </div>
  );
};

export default RaceTimeline;