import React from 'react';

function SliderField({ label, value, onChange }) {

  const fullNames = {
    W: 'Weights',
    D: 'Distance',
    G: 'Going'
  };

  const tooltipText = fullNames[label] || label;

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flex: 1 }}>
      <label style={{ whiteSpace: 'nowrap', minWidth: '55px' }}>{label}: {value}%</label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        title={`${tooltipText}: ${value}%`}
        onChange={onChange}
        style={{ width: '100%' }}
      />
    </div>
  );
}

// Accept control values and setters directly from FormChart
export default function ThreeSliders({ wValue, setW, dValue, setD, gValue, setG }) {
  return (
    <div style={{ padding: '10px', paddingTop: '0px', display: 'flex', flexDirection: 'row', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
      <SliderField label="W" value={wValue} onChange={(e) => setW(Number(e.target.value))} />
      <SliderField label="D" value={dValue} onChange={(e) => setD(Number(e.target.value))} />
      <SliderField label="G" value={gValue} onChange={(e) => setG(Number(e.target.value))} />
    </div>
  );
}
