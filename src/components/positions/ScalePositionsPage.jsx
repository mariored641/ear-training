import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ControlPanel from './ControlPanel';
import DisplayOptionsBar from './DisplayOptionsBar';
import ArpeggioOptionsBar from './ArpeggioOptionsBar';
import FretboardDisplay from './FretboardDisplay';
import QuickReferencePopup from './QuickReferencePopup';
import { generateFretboardNotes } from '../../utils/positionCalculations';
import './ScalePositionsPage.css';

const MAX_ACTIVE_ARPEGGIOS = 3;

const ScalePositionsPage = () => {
  const navigate = useNavigate();

  const [selectedRoot, setSelectedRoot] = useState('A');
  const [selectedType, setSelectedType] = useState('minor');
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [displayMode, setDisplayMode] = useState('dots');
  const [showPentatonic, setShowPentatonic] = useState(false);
  const [isQuickRefOpen, setIsQuickRefOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('positions');

  // Arpeggio tab state
  const [activeArpeggios, setActiveArpeggios] = useState([]);
  const [hideRoots, setHideRoots] = useState(false);

  const fretboardNotes = useMemo(
    () => generateFretboardNotes(selectedRoot, selectedType, selectedPositions, showAll),
    [selectedRoot, selectedType, selectedPositions, showAll]
  );

  // In the Arpeggios tab, always show all notes (showAll=true) so the fretboard
  // is never empty — user can still filter by position using the position buttons.
  const arpeggioFretboardNotes = useMemo(
    () => generateFretboardNotes(selectedRoot, selectedType, selectedPositions, selectedPositions.length === 0 ? true : showAll),
    [selectedRoot, selectedType, selectedPositions, showAll]
  );

  const handleQuickRefOpen = useCallback(() => setIsQuickRefOpen(true), []);
  const handleQuickRefClose = useCallback(() => setIsQuickRefOpen(false), []);

  const handleArpeggioToggle = useCallback((id) => {
    setActiveArpeggios(prev => {
      if (prev.includes(id)) {
        return prev.filter(a => a !== id);
      }
      if (prev.length >= MAX_ACTIVE_ARPEGGIOS) {
        // Drop the oldest, add new one
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }, []);

  // Clear arpeggios when switching away from arpeggio tab
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab !== 'arpeggios') {
      setActiveArpeggios([]);
    }
  }, []);

  const scaleTitle = `${selectedRoot} ${selectedType === 'major' ? 'Major' : 'Minor'}`;

  // Shared fretboard + controls used by both positions and arpeggios tabs
  const sharedControls = (
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
  );

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
          onClick={() => handleTabChange('positions')}
        >
          Positions
        </button>
        <button
          className={`tab-btn ${activeTab === 'arpeggios' ? 'active' : ''}`}
          onClick={() => handleTabChange('arpeggios')}
        >
          Arpeggios
        </button>
        <button
          className={`tab-btn ${activeTab === 'allscales' ? 'active' : ''}`}
          onClick={() => handleTabChange('allscales')}
        >
          All Scales
        </button>
      </div>

      {/* Content */}
      {activeTab === 'positions' && (
        <div className="positions-content">
          {sharedControls}

          <DisplayOptionsBar
            selectedMode={displayMode}
            onModeChange={setDisplayMode}
            showPentatonic={showPentatonic}
            onPentatonicChange={setShowPentatonic}
          />

          <FretboardDisplay
            notes={fretboardNotes}
            displayMode={displayMode}
            showAll={showAll}
            selectedPositions={selectedPositions}
            showPentatonic={showPentatonic}
            selectedType={selectedType}
            selectedRoot={selectedRoot}
          />
        </div>
      )}

      {activeTab === 'arpeggios' && (
        <div className="positions-content">
          {sharedControls}

          <DisplayOptionsBar
            selectedMode={displayMode}
            onModeChange={setDisplayMode}
            showPentatonic={showPentatonic}
            onPentatonicChange={setShowPentatonic}
          />

          <ArpeggioOptionsBar
            activeArpeggios={activeArpeggios}
            onArpeggioToggle={handleArpeggioToggle}
            hideRoots={hideRoots}
            onHideRootsChange={setHideRoots}
          />

          <FretboardDisplay
            notes={arpeggioFretboardNotes}
            displayMode={displayMode}
            showAll={selectedPositions.length === 0 ? true : showAll}
            selectedPositions={selectedPositions}
            showPentatonic={showPentatonic}
            selectedType={selectedType}
            selectedRoot={selectedRoot}
            activeArpeggios={activeArpeggios}
            hideRoots={hideRoots}
          />
        </div>
      )}

      {activeTab === 'allscales' && (
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
