import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ControlPanel from './ControlPanel';
import DisplayOptionsBar from './DisplayOptionsBar';
import FretboardDisplay from './FretboardDisplay';
import QuickReferencePopup from './QuickReferencePopup';
import { generateFretboardNotes } from '../../utils/positionCalculations';
import './ScalePositionsPage.css';

const ScalePositionsPage = () => {
  const navigate = useNavigate();

  const [selectedRoot, setSelectedRoot] = useState('A');
  const [selectedType, setSelectedType] = useState('minor');
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [displayMode, setDisplayMode] = useState('dots');
  const [isQuickRefOpen, setIsQuickRefOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('positions');

  const fretboardNotes = useMemo(
    () => generateFretboardNotes(selectedRoot, selectedType, selectedPositions, showAll),
    [selectedRoot, selectedType, selectedPositions, showAll]
  );

  const handleQuickRefOpen = useCallback(() => setIsQuickRefOpen(true), []);
  const handleQuickRefClose = useCallback(() => setIsQuickRefOpen(false), []);

  // Build title string
  const scaleTitle = `${selectedRoot} ${selectedType === 'major' ? 'Major' : 'Minor'}`;

  return (
    <div className="scale-positions-page">
      {/* Header */}
      <header className="positions-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            &larr;
          </button>
        </div>
        <div className="header-center">
          <h1 className="positions-title">Scale Positions</h1>
          <p className="positions-subtitle">{scaleTitle}</p>
        </div>
        <div className="header-right" />
      </header>

      {/* Tabs */}
      <div className="positions-tabs">
        <button
          className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`}
          onClick={() => setActiveTab('positions')}
        >
          Positions
        </button>
        <button
          className={`tab-btn ${activeTab === 'allscales' ? 'active' : ''}`}
          onClick={() => setActiveTab('allscales')}
        >
          All Scales
        </button>
      </div>

      {/* Content */}
      {activeTab === 'positions' ? (
        <div className="positions-content">
          <ControlPanel
            selectedRoot={selectedRoot}
            onRootChange={setSelectedRoot}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            selectedPositions={selectedPositions}
            onPositionsChange={setSelectedPositions}
            showAll={showAll}
            onShowAllChange={setShowAll}
            onQuickRefClick={handleQuickRefOpen}
          />

          <DisplayOptionsBar
            selectedMode={displayMode}
            onModeChange={setDisplayMode}
          />

          <FretboardDisplay
            notes={fretboardNotes}
            displayMode={displayMode}
            showAll={showAll}
            selectedPositions={selectedPositions}
          />
        </div>
      ) : (
        <div className="placeholder-content">
          <div className="placeholder-icon">&#128679;</div>
          <h2>All Scales</h2>
          <p>This feature is under development</p>
          <p className="placeholder-hebrew">בפיתוח</p>
        </div>
      )}

      {/* Quick Reference Popup */}
      {isQuickRefOpen && (
        <QuickReferencePopup onClose={handleQuickRefClose} />
      )}
    </div>
  );
};

export default ScalePositionsPage;
