import React, { useMemo, useState } from 'react';
import '../../css/FavoriteSelections.css';

const FavoriteSelections = ({ races, onClose }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'time', direction: 'asc' });

  const selections = useMemo(() => {
    const results = [];

    races.forEach(race => {
      const horseData = race.horses.map(horse => {
        const ratings = (horse.past || []).map(p => parseFloat(p.name)).filter(n => !isNaN(n));
        const maxRating = ratings.length > 0 ? Math.max(...ratings) : 0;
        
        const lastOdd = horse.odds?.[horse.odds.length - 1];
        const currentOdds = (lastOdd && lastOdd !== "null" && lastOdd !== "NR") ? parseFloat(lastOdd) : Infinity;
        
        return {
          name: horse.name,
          rating: maxRating,
          odds: currentOdds,
          venue: `${race.time} ${race.place}`,
          time: race.time,
          place: race.place
        };
      });

      // Determine highest rating and shortest odds in this specific race
      const highestRating = Math.max(...horseData.map(h => h.rating));
      const shortestOdds = Math.min(...horseData.map(h => h.odds));

      // Filter for horses that are BOTH top rated and the favorite
      horseData.forEach(h => {
        if (h.rating > 0 && h.rating === highestRating && h.odds !== Infinity && h.odds === shortestOdds) {
          results.push(h);
        }
      });
    });

    return results.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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

  if (selections.length === 0) {
    return <div className="no-data">No horses currently match top-rating and favorite status.</div>;
  }

  return (
    <div className="favorite-selections-container">
      <table className="favorite-table">
        <thead>
          <tr>
            <th onClick={() => requestSort('venue')} className="sortable">
              Race{getSortIndicator('venue')}
            </th>
            <th onClick={() => requestSort('name')} className="sortable">
              Horse{getSortIndicator('name')}
            </th>
            <th onClick={() => requestSort('odds')} className="sortable">
              Odds{getSortIndicator('odds')}
            </th>
          </tr>
        </thead>
        <tbody>
          {selections.map((item, idx) => (
            <tr key={`${item.name}-${idx}`}>
              <td 
                className="venue-cell jump-link" 
                onClick={() => handleJump(item.time, item.place)}
              >
                {item.venue}
              </td>
              <td><strong>{item.name}</strong></td>
              <td className="odds-cell">{item.odds}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FavoriteSelections;