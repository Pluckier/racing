import React from 'react';
import { Chart } from 'react-google-charts';
import SkeletonRaceTimeline from '../skeletons/SkeletonRaceTimeline';
import '../../css/RaceTimeline.css';

const RaceTimeline = ({ races, theme: currentTheme }) => {
  const columns = [
    { type: 'string', id: 'Venue' },
    { type: 'string', id: 'Race' },
    { type: 'string', role: 'tooltip', p: { html: true } },
    { type: 'date', id: 'Start' },
    { type: 'date', id: 'End' },
  ];

  // Detect if the user is in dark mode to adjust chart colors dynamically
  const isDark = currentTheme === 'dark';
  const theme = {
    bg: isDark ? '#2a2a2a' : '#ffffff',
    text: isDark ? '#e0e0e0' : '#333333',
    tooltip: isDark ? 'background-color: #595656; color: #ffffff; border: 1px solid #444;' : 'background-color: #ffffff; color: #333333; border: 1px solid #ccc;'
  };

  const rows = races.map((race) => {
    const [hours, minutes] = race.time.split(':').map(Number);

    // Extract distance from detail (e.g., "2m 4f", "5f") to determine duration
    const milesMatch = race.detail?.match(/(\d+)m/);
    const furlongsMatch = race.detail?.match(/(\d+)f/);
    const m = milesMatch ? parseInt(milesMatch[1], 10) : 0;
    const f = furlongsMatch ? parseInt(furlongsMatch[1], 10) : 0;
    const totalMiles = m + (f / 8);

    // Heuristic based on user request: 1m -> 2m, 3m -> 9m
    // Formula: duration = 1.5 * miles + 0.5 * miles^2
    const duration = totalMiles > 0 ? (1.5 * totalMiles + 0.5 * Math.pow(totalMiles, 2)) : 10;

    // We create a date object for today at the specific race time
    const start = new Date(0, 0, 0, hours, minutes);
    const end = new Date(0, 0, 0, hours, minutes + Math.max(2, duration));

    // Break the detail into two lines if it contains a '(' (e.g., "Handicap Chase (Class 4)")
    const detailParts = (race.detail || '').split('(');
    const displayDetail = detailParts.length > 1 
      ? `${detailParts[0].trim()}<br/>(${detailParts.slice(1).join('(')}` 
      : race.detail || '';

    // Create an HTML string for the tooltip and match the theme
    const tooltipHtml = `<div style="padding: 10px; ${theme.tooltip} font-family: sans-serif; font-size: 13px; line-height: 1.4;">${displayDetail}</div>`;

    return [race.place, race.time, tooltipHtml, start, end];
  });

  const data = [columns, ...rows];

  // Calculate unique meetings to determine the number of rows
  const rowCount = new Set(races.map(r => r.place)).size;
  const computedHeight = (rowCount * 40) + 60; // 40px per row + 60px for the time axis/padding

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
    // 1st venue = Blue, 2nd venue = Red, others follow...
    colors: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043'],
    backgroundColor: theme.bg,
    height: computedHeight,
  };

  if (!races.length) return null;

  return (
    <div className="race-timeline-container">
      <Chart
        chartType="Timeline"
        data={data}
        height={computedHeight - 40}
        loader={<SkeletonRaceTimeline height={computedHeight - 40} />}
        width="100%"
        options={options}
        chartEvents={chartEvents}
      />
    </div>
  );
};

export default RaceTimeline;