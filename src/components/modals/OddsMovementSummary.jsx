import React, { useMemo, useState } from 'react';
import '../../css/OddsMovementSummary.css';

const OddsMovementSummary = ({ races, onClose }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'diff', direction: 'asc' });

  const movementData = useMemo(() => {
    const list = [];
    races.forEach(race => {
      race.horses.forEach(horse => {
        const odds = horse.odds || [];

        // If the horse is currently a non-runner (latest odd is null/NR), exclude it from the summary
        const latestOdd = odds[odds.length - 1];
        if (latestOdd === "null" || latestOdd === "NR") return;

        // Filter out "null", "NR", or empty odds to ensure we have valid numbers
        const validOdds = odds.filter(o => o !== "null" && o !== "NR" && !isNaN(parseFloat(o))).map(o => parseFloat(o));
        
        if (validOdds.length > 1) {
          const biggest = Math.max(...validOdds);
          const current = validOdds[validOdds.length - 1];
          const diff = current - biggest;
          const percent = biggest > 0 ? ((biggest - current) / biggest) * 100 : 0;
          
          list.push({
            name: horse.name,
            venue: `${race.time} ${race.place}`,
            time: race.time,
            place: race.place,
            biggest,
            current,
            diff: parseFloat(diff.toFixed(2)),
            percent: parseFloat(percent.toFixed(1))
          });
        }
      });
    });

    // Sort the list based on sortConfig
    return list.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Case-insensitive sorting for strings (Names and Venues)
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [races, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return ' ↕';
    return sortConfig.direction === 'asc' ? ' ↓' : ' ↑';
  };

  const handleJump = (time, place) => {
    const id = `${time}${place.replace(/\s+/g, '')}`;
    window.location.hash = id;
    if (onClose) onClose();
  };

  if (movementData.length === 0) {
    return <div className="no-data">No odds movement recorded yet.</div>;
  }

  return (
    <div className="odds-summary-container">
      <table className="odds-summary-table">
        <thead>
          <tr>
            <th onClick={() => requestSort('venue')} className="sortable">
              Race{getSortIndicator('venue')}
            </th>
            <th onClick={() => requestSort('name')} className="sortable">
              Horse{getSortIndicator('name')}
            </th>
            <th onClick={() => requestSort('biggest')} className="sortable">
              Biggest{getSortIndicator('biggest')}
            </th>
            <th onClick={() => requestSort('current')} className="sortable">
              Current{getSortIndicator('current')}
            </th>
            <th onClick={() => requestSort('diff')} className="sortable">
              Diff{getSortIndicator('diff')}
            </th>
            <th onClick={() => requestSort('percent')} className="sortable">
              % Move{getSortIndicator('percent')}
            </th>
          </tr>
        </thead>
        <tbody>
          {movementData.map((item, idx) => (
            <tr key={`${item.name}-${idx}`}>
              <td 
                className="venue-cell jump-link" 
                onClick={() => handleJump(item.time, item.place)}
              >
                {item.venue}
              </td>
              <td><strong>{item.name}</strong></td>
              <td>{item.biggest}</td>
              <td>{item.current}</td>
              <td className={item.diff < 0 ? 'move-down' : item.diff > 0 ? 'move-up' : ''}>
                {item.diff > 0 ? `+${item.diff}` : item.diff}
              </td>
              <td className={item.percent > 0 ? 'move-down' : item.percent < 0 ? 'move-up' : ''}>
                {item.percent}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OddsMovementSummary;
