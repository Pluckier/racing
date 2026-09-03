import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'react-google-charts';
import SkeletonRaceTimeline from '../skeletons/SkeletonRaceTimeline';
import '../../css/RaceTimeline.css';

const RaceTimeline = ({ races, theme: currentTheme }) => {
  // State to hold the current time, updating every minute
  const [now, setNow] = useState(new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every 60 seconds
    return () => clearInterval(timer);
  }, []);

  const columns = [
    { type: 'string', id: 'Venue' },
    { type: 'string', id: 'Race' },
    { type: 'string', role: 'tooltip', p: { html: true } },
    { type: 'date', id: 'Start' },
    { type: 'date', id: 'End' },
  ];

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

  const isDark = currentTheme === 'dark';
  const theme = {
    bg: isDark ? '#2a2a2a' : '#ffffff',
    text: isDark ? '#e0e0e0' : '#333333',
    tooltip: isDark ? 'background-color: #595656; color: #ffffff; border: 1px solid #444;' : 'background-color: #ffffff; color: #333333; border: 1px solid #ccc;'
  };

  // Keep track of the earliest start and latest end times to calculate line placement boundaries
  let globalMinTime = null;
  let globalMaxTime = null;

  const rows = races.map((race) => {
    const totalPastRuns = race.horses?.reduce((acc, horse) => acc + Math.min(horse.past?.length || 0, 6), 0) || 0;
    const maxPossibleRuns = (race.horses?.length || 0) * 6;

    const formPercentage = maxPossibleRuns > 0 ? Math.round((totalPastRuns / maxPossibleRuns) * 100) : 0;
    let emoji = "";
    if (formPercentage >= 0 && formPercentage <= 33) emoji = " ❌";
    else if (formPercentage >= 34 && formPercentage <= 55) emoji = " ⚠️";
    else if (formPercentage >= 56 && formPercentage <= 74) emoji = " 👎";
    else if (formPercentage >= 75 && formPercentage <= 87) emoji = " 👍";
    else if (formPercentage >= 88 && formPercentage <= 99) emoji = " 👌";
    else if (formPercentage === 100) emoji = " ✅💯";

    const finalDisplay = `${formPercentage}%${emoji}`;
    const icon = getRaceIcon(race);
    const [hours, minutes] = race.time.split(':').map(Number);

    const milesMatch = race.detail?.match(/(\d+)m/);
    const furlongsMatch = race.detail?.match(/(\d+)f/);
    const m = milesMatch ? parseInt(milesMatch[1], 10) : 0;
    const f = furlongsMatch ? parseInt(furlongsMatch[1], 10) : 0;
    const totalMiles = m + (f / 8);

    const duration = totalMiles > 0 ? (1.5 * totalMiles + 0.5 * Math.pow(totalMiles, 2)) : 10;

    const start = new Date(0, 0, 0, hours, minutes);
    const end = new Date(0, 0, 0, hours, minutes + Math.max(2, duration));

    // Update global boundary frames
    if (!globalMinTime || start < globalMinTime) globalMinTime = start;
    if (!globalMaxTime || end > globalMaxTime) globalMaxTime = end;

    const detailParts = (race.detail || '').split('(');
    const displayDetail = detailParts.length > 1
      ? `${detailParts[0].trim()}<br/>(${detailParts.slice(1).join('(')}`
      : race.detail || '';

    const tooltipHtml = `<div style="padding: 10px; ${theme.tooltip} font-family: sans-serif; font-size: 13px; line-height: 1.4;">${icon} ${displayDetail} FORM:${finalDisplay}</div>`;

    return [race.place, race.time, tooltipHtml, start, end];
  });

  const data = [columns, ...rows];
  const rowCount = new Set(races.map(r => r.place)).size;
  const computedHeight = (rowCount * 40) + 60;

  // --- CURRENT TIME LINE CALCULATIONS ---
  let linePositionLeft = null;

  if (globalMinTime && globalMaxTime) {
    // Standardize current time to match the chart date structure (Year 0, Month 0, Day 0)
    const normalizedNow = new Date(0, 0, 0, now.getHours(), now.getMinutes());

    // Check if the current time actually falls within the racing timeline frame
    if (normalizedNow >= globalMinTime && normalizedNow <= globalMaxTime) {
      const totalTimelineRange = globalMaxTime.getTime() - globalMinTime.getTime();
      const currentTimelineElapsed = normalizedNow.getTime() - globalMinTime.getTime();

      // Convert to an initial percentage position
      const percentage = (currentTimelineElapsed / totalTimelineRange) * 100;

      // Account for Google Chart's default layout paddings (Roughly ~10% offset for the Left Row Labels)
      const labelPaddingOffset = 11;
      linePositionLeft = labelPaddingOffset + (percentage * (1 - labelPaddingOffset / 100));
    }
  }

  const chartEvents = [
    {
      eventName: 'select',
      callback: ({ chartWrapper }) => {
        const chart = chartWrapper.getChart();
        const selection = chart.getSelection();
        if (selection.length > 0) {
          const row = selection[0].row;
          const race = races[row];
          const raceId = `${race.time}${race.place.replace(/\s+/g, '')}`;
          window.location.hash = raceId;
        }
      },
    },
  ];

  const options = {
    timeline: {
      showRowLabels: true,
      groupByRowLabel: true,
      colorByRowLabel: true,
      rowLabelStyle: { fontSize: 12, color: theme.text },
      barLabelStyle: { fontSize: 10, color: theme.text },
    },
    tooltip: { isHtml: true },
    colors: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043'],
    backgroundColor: theme.bg,
    height: computedHeight,
  };

  if (!races.length) return null;

  return (
    <div className="race-timeline-container" ref={containerRef} style={{ position: 'relative' }}>
      <Chart
        chartType="Timeline"
        data={data}
        chartVersion="51"
        height={computedHeight - 40}
        loader={<SkeletonRaceTimeline height={computedHeight - 40} />}
        width="100%"
        options={options}
        chartEvents={chartEvents}
      />

      {/* Absolute Overlaid Vertical Indicator Line */}
      {linePositionLeft !== null && (
        <div
          className="timeline-now-indicator"
          style={{
            position: 'absolute',
            left: `${linePositionLeft}%`,
            top: '11px', // Pushes it right below the timeline header labels
            height: `${computedHeight - 99}px`, // Stops right above the bottom horizontal axis
            width: '2px',
            backgroundColor: '#ffffffff', // Crimson warning line style
            boxShadow: '0 0 6px rgba(11, 10, 10, 0.6)',
            opacity: 0.7,
            zIndex: 10,
            pointerEvents: 'none' // Allows users to click "through" the line onto chart bars
          }}
        >
          {/* Subtle indicator bulb element on top of the line */}
          <div style={{
            position: 'absolute',
            top: '-4px',
            left: '-3px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ffffffff'
          }} />
          {/* Subtle indicator bulb element on top of the line */}
          <div style={{
            position: 'absolute',
            top: `${computedHeight - 99}px`,
            left: '-3px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ffffffff'
          }} />
        </div>
      )}
    </div>
  );
};

export default RaceTimeline;
