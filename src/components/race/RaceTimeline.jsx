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


const RaceTimeline = ({ races = [], theme: currentTheme }) => {
  const containerRef = useRef(null);
  const hasMeasured = useRef(false);
  const validRaceIndexMapRef = useRef([]); // maps chart row -> original races index

  // Build rows and find global min/max times (only from validated rows)
  let globalMinTime = null;
  let globalMaxTime = null;

  const rows = useMemo(() => {
    const result = [];
    const localValidMap = [];

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
              window.location.hash = raceId;
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