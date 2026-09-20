import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/store';
import '../../css/NotesModal.css';

const NotesModal = ({ onClose, currentDateStr, races }) => {
  const rawNotedHorses = useStore((state) => state.notedHorses) || [];
  const notedHorses = useMemo(() => {
    const allHorses = (races || []).flatMap((r) => (r.horses || []).map((h) => ({ ...h, time: r.time, place: r.place })));
    return rawNotedHorses.map((nh) => {
      const match = allHorses.find((h) => (h.id || `${h.name}@${h.time}${h.place}`) === nh.id);
      if (match) {
        const oddsArr = match.odds || [];
        const last = oddsArr[oddsArr.length - 1];
        const latestOdds = (last && last !== "null" && last !== "NR" && !isNaN(last))
          ? last
          : oddsArr.slice().reverse().find(o => o && o !== "null" && o !== "NR" && !isNaN(o)) || '—';
        return { ...match, id: nh.id, isRunning: true, currentOdds: latestOdds };
      }
      // Not running today – provide fallback values
      return {
        id: nh.id,
        name: nh.name,
        number: nh.number ?? '—',
        silks: nh.silks ?? null,
        draw: nh.draw ?? null,
        trainer: nh.trainer ?? '—',
        jockey: nh.jockey ?? '—',
        form: nh.form ?? '—',
        currentOdds: nh.currentOdds ?? '—',
        time: null,
        place: null,
        isRunning: false,
      };
    });
  }, [rawNotedHorses, races]);
  const clearNotedHorses = useStore((state) => state.clearNotedHorses);
  const removeNotedHorse = useStore((state) => state.removeNotedHorse);

  const [sortConfig, setSortConfig] = useState({ key: 'time', direction: 'asc' });

  const sortedHorses = useMemo(() => {
    return [...notedHorses].sort((a, b) => {
      let aVal = a[sortConfig.key] ?? '';
      let bVal = b[sortConfig.key] ?? '';

      if (sortConfig.key === 'odds' || sortConfig.key === 'currentOdds') {
        const numA = parseFloat(a.currentOdds);
        const numB = parseFloat(b.currentOdds);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [notedHorses, sortConfig]);

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
    if (!time || !place) return;
    const id = `${time}${place.replace(/\s+/g, '')}`;
    const targetHash = currentDateStr ? `#${currentDateStr}@${id}` : `#${id}`;
    window.location.assign(targetHash);
    if (onClose) onClose();
  };

  return (
    <div className="notes-modal-container">
      <div className="notes-toolbar">
        <div className="notes-count">
          Noted Horses: <span>{notedHorses.length}</span>
        </div>
        <button
          className="clear-all-btn"
          onClick={clearNotedHorses}
          disabled={notedHorses.length === 0}
          title="Clear all noted horses from the store"
        >
          🗑️ Clear All
        </button>
      </div>

      {notedHorses.length === 0 ? (
        <div className="notes-empty-state">
          <span className="notes-empty-icon">📝</span>
          <p className="notes-empty-text">
            No horses noted yet. Click on any horse's number (e.g. <strong>1.</strong>) in the racecard to add it to your notes.
          </p>
        </div>
      ) : (
        <div className="notes-table-wrapper">
          <table className="notes-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('name')} className="sortable">
                  Horse{getSortIndicator('name')}
                </th>
                <th onClick={() => requestSort('time')} className="sortable">
                  Race{getSortIndicator('time')}
                </th>
                <th onClick={() => requestSort('currentOdds')} className="sortable">
                  Odds{getSortIndicator('currentOdds')}
                </th>
                <th onClick={() => requestSort('trainer')} className="sortable hide-mobile">
                  Trainer{getSortIndicator('trainer')}
                </th>
                <th onClick={() => requestSort('jockey')} className="sortable hide-mobile">
                  Jockey{getSortIndicator('jockey')}
                </th>
                <th className="hide-mobile">Form</th>
                <th style={{ textAlign: 'center', width: '50px' }}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {sortedHorses.map((h, idx) => {
                const uniqueKey = h.id || `${h.name}-${h.time}-${h.place}-${idx}`;
                return (
                  <tr key={uniqueKey}>
                    <td>
                      <div className="notes-horse-cell" style={{ opacity: h.isRunning ? 1 : 0.5 }}>
                        {h.silks && (
                          <img src={h.silks} alt="silks" className="notes-silks" />
                        )}
                        <span className="notes-horse-number">{h.number}.</span>
                        <span className="notes-horse-name">{h.name}</span>
                        {h.draw && <span style={{ color: '#9ca3af', fontSize: '0.85em' }}>({h.draw})</span>}
                      </div>
                    </td>
                    <td>
                      <span
                        className="notes-race-link"
                        onClick={h.isRunning && h.time && h.place ? () => handleJump(h.time, h.place) : undefined}
                        title={h.isRunning && h.time && h.place ? `Jump to ${h.time} ${h.place}` : 'Not running today'}
                        style={{ cursor: h.isRunning && h.time && h.place ? 'pointer' : 'default', color: h.isRunning && h.time && h.place ? 'inherit' : '#9ca3af' }}
                      >
                        {h.isRunning && h.time && h.place ? `${h.time} ${h.place}` : '—'}
                      </span>
                    </td>
                    <td>
                      <span className="notes-odds-badge">
                        {h.currentOdds || '—'}
                      </span>
                    </td>
                    <td className="hide-mobile">
                      {h.trainer || '—'}
                    </td>
                    <td className="hide-mobile">
                      {h.jockey || '—'}
                    </td>
                    <td className="hide-mobile" style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>
                      {h.form || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="notes-remove-btn"
                        onClick={() => removeNotedHorse(h.id || `${h.name}@${h.time}${h.place}`)}
                        title="Remove from notes"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NotesModal;
