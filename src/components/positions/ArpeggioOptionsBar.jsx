import React from 'react';
import './ArpeggioOptionsBar.css';

export const ARPEGGIOS = [
  { id: 'I',   label: 'I',   color: '#E91E8C', textColor: '#fff' },   // hot pink — far from root red
  { id: 'IV',  label: 'IV',  color: '#FF5722', textColor: '#fff' },   // deep orange
  { id: 'V',   label: 'V',   color: '#FFC107', textColor: '#1a1a2e' }, // amber
  { id: 'i',   label: 'i',   color: '#00BCD4', textColor: '#1a1a2e' }, // cyan — far from root blue
  { id: 'iv',  label: 'iv',  color: '#673AB7', textColor: '#fff' },   // deep purple
  { id: 'v',   label: 'v',   color: '#E040FB', textColor: '#1a1a2e' }, // bright purple-pink
  { id: 'dim', label: 'ø',   color: '#76FF03', textColor: '#1a1a2e' }, // lime green
];

const ArpeggioOptionsBar = ({ activeArpeggios, onArpeggioToggle, hideRoots, onHideRootsChange }) => {
  return (
    <div className="arpeggio-options-bar">
      <span className="arpeggio-label">Arpeggios:</span>
      <div className="arpeggio-buttons">
        {ARPEGGIOS.map((arp) => {
          const isActive = activeArpeggios.includes(arp.id);
          return (
            <button
              key={arp.id}
              className={`arpeggio-btn ${isActive ? 'active' : ''}`}
              style={isActive ? {
                backgroundColor: arp.color,
                color: arp.textColor,
                borderColor: arp.color,
                boxShadow: `0 0 8px ${arp.color}88`,
              } : {
                borderColor: arp.color,
                color: arp.color,
              }}
              onClick={() => onArpeggioToggle(arp.id)}
              title={`${arp.label} chord`}
            >
              {arp.label}
            </button>
          );
        })}
      </div>
      <div className="arpeggio-right-controls">
        <button
          className={`hide-roots-btn ${hideRoots ? 'active' : ''}`}
          onClick={() => onHideRootsChange(!hideRoots)}
          title="Show/hide root note colors"
        >
          Roots
        </button>
        {activeArpeggios.length > 0 && (
          <button
            className="arpeggio-clear-btn"
            onClick={() => activeArpeggios.forEach(id => onArpeggioToggle(id))}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(ArpeggioOptionsBar);
