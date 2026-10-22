import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RhythmAudioPlayer from '../../utils/RhythmAudioPlayer';
import Header from '../common/Header';
import RhythmExplorer from './RhythmExplorer';
import Polyrhythm from './Polyrhythm';
import AdvancedSubdivisions from './AdvancedSubdivisions';
import StickyControls from './StickyControls';
import CellIcon from './CellIcon';
import { clampTempo, tapTempo } from '../../utils/rhythm/patterns';
import './Exercise4.css';

const CELL_LEGEND = [
  ['accent', 'rhythm.cellBass'],
  ['normal', 'rhythm.cellSnare'],
  ['soft', 'rhythm.cellHihat'],
  ['mute', 'rhythm.cellRest']
];

const Exercise4 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('rhythmExplorer');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Shared playback state
  const [sharedBpm, setBpm] = useState(90);
  const setSharedBpm = value => setBpm(clampTempo(value));
  const [sharedIsPlaying, setSharedIsPlaying] = useState(false);
  const [sharedSoundSet, setSharedSoundSet] = useState('classicClick');
  const [tapTimes, setTapTimes] = useState([]);

  // Refs to tab component methods
  const rhythmExplorerRef = React.useRef(null);
  const polyrhythmRef = React.useRef(null);
  const advancedSubdivisionsRef = React.useRef(null);

  // Stop all playback
  const stopPlayback = () => {
    RhythmAudioPlayer.stop();
    setSharedIsPlaying(false);
  };

  // Handle tab change - stop playback first
  const handleTabChange = (newTab) => {
    stopPlayback();
    setActiveTab(newTab);
  };

  // Cleanup on unmount - stop playback when leaving page
  useEffect(() => {
    return () => {
      RhythmAudioPlayer.dispose();
    };
  }, []);

  const handleStop = () => {
    stopPlayback();
    navigate('/');
  };

  const handlePlayStop = () => {
    // Call the appropriate tab's play/stop handler
    if (activeTab === 'rhythmExplorer' && rhythmExplorerRef.current) {
      rhythmExplorerRef.current.handlePlayStop();
    } else if (activeTab === 'polyrhythm' && polyrhythmRef.current) {
      polyrhythmRef.current.handlePlayStop();
    } else if (activeTab === 'advanced' && advancedSubdivisionsRef.current) {
      advancedSubdivisionsRef.current.handlePlayStop();
    }
  };

  const handleClear = () => {
    // Call the appropriate tab's clear handler
    if (activeTab === 'rhythmExplorer' && rhythmExplorerRef.current) {
      rhythmExplorerRef.current.handleClear();
    } else if (activeTab === 'polyrhythm' && polyrhythmRef.current) {
      polyrhythmRef.current.handleClear();
    } else if (activeTab === 'advanced' && advancedSubdivisionsRef.current) {
      advancedSubdivisionsRef.current.handleClear();
    }
  };

  const handleTap = () => {
    const result = tapTempo(tapTimes, Date.now());
    setTapTimes(result.taps);
    if (result.bpm !== null) setSharedBpm(result.bpm);
  };

  return (
    <div className="exercise4-container">
      <Header
        title={t('rhythm.title')}
        showStop={true}
        onStopClick={handleStop}
        onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
      />

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'rhythmExplorer' ? 'active' : ''}`}
          onClick={() => handleTabChange('rhythmExplorer')}
        >
          {t('rhythm.explorer')}
        </button>
        <button
          className={`tab-button ${activeTab === 'polyrhythm' ? 'active' : ''}`}
          onClick={() => handleTabChange('polyrhythm')}
        >
          {t('rhythm.polyrhythm')}
        </button>
        <button
          className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => handleTabChange('advanced')}
        >
          {t('rhythm.advanced')}
        </button>
      </div>

      {/* Sticky Controls - Shared across all tabs */}
      <StickyControls
        bpm={sharedBpm}
        setBpm={setSharedBpm}
        isPlaying={sharedIsPlaying}
        onPlayStop={handlePlayStop}
        onClear={handleClear}
        onTap={handleTap}
        soundSet={sharedSoundSet}
        setSoundSet={setSharedSoundSet}
      />

      {/* Cell legend - same colors/icons in every tab */}
      <div className="cell-legend">
        {CELL_LEGEND.map(([state, key]) => (
          <span key={state} className="cell-legend-item">
            <span className={`cell-legend-swatch rc rc-${state}`}>
              <CellIcon state={state} />
            </span>
            {t(key)}
          </span>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'rhythmExplorer' && (
          <RhythmExplorer
            ref={rhythmExplorerRef}
            sharedBpm={sharedBpm}
            setSharedBpm={setSharedBpm}
            sharedIsPlaying={sharedIsPlaying}
            setSharedIsPlaying={setSharedIsPlaying}
            sharedSoundSet={sharedSoundSet}
            setSharedSoundSet={setSharedSoundSet}
          />
        )}
        {activeTab === 'polyrhythm' && (
          <Polyrhythm
            ref={polyrhythmRef}
            sharedBpm={sharedBpm}
            setSharedBpm={setSharedBpm}
            sharedIsPlaying={sharedIsPlaying}
            setSharedIsPlaying={setSharedIsPlaying}
            sharedSoundSet={sharedSoundSet}
          />
        )}
        {activeTab === 'advanced' && (
          <AdvancedSubdivisions
            ref={advancedSubdivisionsRef}
            sharedBpm={sharedBpm}
            setSharedBpm={setSharedBpm}
            sharedIsPlaying={sharedIsPlaying}
            setSharedIsPlaying={setSharedIsPlaying}
            sharedSoundSet={sharedSoundSet}
          />
        )}
      </div>
    </div>
  );
};

export default Exercise4;
