import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LINE_COLORS } from '../../constants/chartConstants';
import '../../css/FormChart.css';

const CustomDot = (props) => {
  const { cx, cy, stroke, payload, dataKey } = props;
  if (payload[`${dataKey}_isLowest`]) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={3} fill={stroke} stroke={stroke} strokeWidth={1} />
        <text x={cx} y={cy - 10} fill={stroke} textAnchor="middle" fontSize={12} fontWeight="bold">
          {dataKey}
        </text>
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={3} fill={stroke} stroke={stroke} strokeWidth={1} />;
};

const OddsChart = ({ horses }) => {
  const [minOdds, setMinOdds] = useState(0);
  const [maxOdds, setMaxOdds] = useState(100);

  const getLatestOdds = (h) => {
    const odds = h.odds || [];
    const last = odds[odds.length - 1];
    return (last && last !== "null" && last !== "NR" && !isNaN(last)) ? parseFloat(last) : Infinity;
  };

  const visibleHorses = useMemo(() => {
    return horses.filter(h => {
      const odds = getLatestOdds(h);
      if (odds === Infinity) return false; // Exclude non-runners from the chart
      return odds >= minOdds && (maxOdds === 100 ? true : odds <= maxOdds);
    });
  }, [horses, minOdds, maxOdds]);

  const chartData = useMemo(() => {
    if (visibleHorses.length === 0) return [];
    // Find the maximum number of odds updates across all horses to define our X-axis range
    const maxLength = Math.max(...visibleHorses.map(h => (h.odds ? h.odds.length : 0)));
    
    // Pre-calculate the minimum odds for each horse to flag the "isLowest" point
    const horseMinOdds = {};
    visibleHorses.forEach(horse => {
      const numericOdds = horse.odds
        ?.filter(o => o && o !== "null" && o !== "NR" && !isNaN(o))
        .map(o => parseFloat(o)) || [];
      horseMinOdds[horse.name] = numericOdds.length > 0 ? Math.min(...numericOdds) : null;
    });

    const annotatedHorses = new Set();

    const data = [];
    for (let i = 0; i < maxLength; i++) {
      const point = { updateIndex: `Update ${i + 1}` };
      visibleHorses.forEach(horse => {
        const oddVal = horse.odds?.[i];
        // Parse numeric odds, ignore "null" or "NR" for the chart line
        if (oddVal && oddVal !== "null" && oddVal !== "NR" && !isNaN(oddVal)) {
          const val = parseFloat(oddVal);
          point[horse.name] = val;
          if (val === horseMinOdds[horse.name] && !annotatedHorses.has(horse.name)) {
            point[`${horse.name}_isLowest`] = true;
            annotatedHorses.add(horse.name);
          }
        }
      });
      data.push(point);
    }
    return data;
  }, [visibleHorses]);

  return (
    <div className="form-chart-container">
      <div className="chart-controls" style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Min Odds Slider */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          padding: '2px 12px',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          backgroundColor: minOdds > 0 ? 'var(--accent)' : 'transparent',
          color: minOdds > 0 ? 'var(--bg)' : 'var(--text)',
          fontSize: '13px'
        }}>
          <span style={{ whiteSpace: 'nowrap' }}>Min: {minOdds === 0 ? 'Any' : minOdds}</span>
          <input 
            type="range" 
            min="0" 
            max="50" 
            step="1" 
            value={minOdds} 
            onChange={(e) => setMinOdds(Number(e.target.value))}
            style={{ width: '60px', cursor: 'pointer', accentColor: minOdds > 0 ? 'var(--bg)' : 'var(--accent)' }}
          />
        </div>

        {/* Max Odds Slider */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          padding: '2px 12px',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          backgroundColor: maxOdds < 100 ? 'var(--accent)' : 'transparent',
          color: maxOdds < 100 ? 'var(--bg)' : 'var(--text)',
          fontSize: '13px'
        }}>
          <span style={{ whiteSpace: 'nowrap' }}>Max: {maxOdds === 100 ? 'Any' : maxOdds}</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            step="10" 
            value={maxOdds} 
            onChange={(e) => setMaxOdds(Number(e.target.value))}
            style={{ width: '60px', cursor: 'pointer', accentColor: maxOdds < 100 ? 'var(--bg)' : 'var(--accent)' }}
          />
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="updateIndex" 
            tick={{ fill: 'var(--text)', fontSize: 12 }} 
          />
          <YAxis 
            reversed // Odds are usually better when lower, but often charts show them normally. 
            // Removing 'reversed' if you prefer high numbers at the top.
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text)', fontSize: 12 }}
            label={{ value: 'Decimal Odds', angle: -90, position: 'insideLeft', fill: 'var(--text)' }}
          />
          <Tooltip 
            shared={false}
            trigger="hover"
            itemSorter={(item) => item.value}
            separator=""
            contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}
            itemStyle={{ fontSize: '16px' }}
            formatter={(value, name, entry) => [
              <span style={{ color: entry.color }}>{name}: {Number(value)}</span>,
              ''
            ]}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            inactiveColor="#666"
          />
          {visibleHorses.map((horse) => {
            // Only draw a line if the horse actually has numeric odds
            const hasData = horse.odds?.some(o => o && o !== "null" && o !== "NR");
            if (!hasData) return null;

            return (
              <Line 
                key={horse.name}
                type="monotone" 
                dataKey={horse.name} 
                stroke={LINE_COLORS[horses.indexOf(horse) % LINE_COLORS.length]} 
                strokeWidth={2}
                dot={<CustomDot />}
                connectNulls // Connects line if a horse misses an update
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OddsChart;
