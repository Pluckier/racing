import React from 'react';

function SliderField({ label, value, onChange }) {

  const fullNames = {
    W: 'Weights',
    D: 'Distance',
    G: 'Going'
  };

  const tooltipText = fullNames[label] || label;

  // Calculates the dynamic filling percentage for the background gradient
  const fillPercentage = value;

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flex: 1 }}>
      <style>{`
        .custom-slider-fill {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          outline: none;
        }

        /* Webkit (Chrome, Safari, Edge) rounded rectangle thumb */
        .custom-slider-fill::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;              /* Width of your rectangle */
          height: 22px;             /* Height of your rectangle */
          border-radius: 4px;       /* Corner rounding */
          background: #007bff;      /* Color of the thumb */
          cursor: grab;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .custom-slider-fill::-webkit-slider-thumb:active {
          cursor: grabbing;
          background: #0056b3;
        }

        /* Firefox rounded rectangle thumb */
        .custom-slider-fill::-moz-range-thumb {
          width: 14px;
          height: 22px;
          border-radius: 4px;
          background: #007bff;
          cursor: grab;
          border: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .custom-slider-fill::-moz-range-thumb:active {
          cursor: grabbing;
          background: #0056b3;
        }
      `}</style>

      <label style={{ whiteSpace: 'nowrap', minWidth: '55px' }}>{label}: {value}%</label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        title={`${tooltipText}: ${value}%`}
        onChange={onChange}
        className="custom-slider-fill"
        style={{
          width: '100%',
          /* Generates a hard-stop gradient that follows the thumb dynamically */
          background: `linear-gradient(to right, #007bff 0%, #007bff ${fillPercentage}%, #9a1515ff ${fillPercentage}%, #0b0a0aff 100%)`
        }}
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
