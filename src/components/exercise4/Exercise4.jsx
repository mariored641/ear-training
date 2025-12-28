import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import RhythmExplorer from './RhythmExplorer';
import Polyrhythm from './Polyrhythm';
import AdvancedSubdivisions from './AdvancedSubdivisions';
import StickyControls from './StickyControls';
import './Exercise4.css';

const Exercise4 = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('rhythmExplorer');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Shared playback state
  const [sharedBpm, setSharedBpm] = useState(90);
  const [sharedIsPlaying, setSharedIsPlaying] = useState(false);
  const [tapTimes, setTapTimes] = useState([]);

  const handleStop = () => {
    navigate('/');
  };

  const handleTap = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-4);
    setTapTimes(newTapTimes);

    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const newBpm = Math.round(60000 / avgInterval);

      if (newBpm >= 40 && newBpm <= 240) {
        setSharedBpm(newBpm);
      }
    }

    setTimeout(() => {
      setTapTimes(prev => prev.filter(t => Date.now() - t < 3000));
    }, 3000);
  };

  return (
    <div className="exercise4-container">
      <Header
        title="Rhythm Training"
        showStop={true}
        onStopClick={handleStop}
        onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
      />

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'rhythmExplorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('rhythmExplorer')}
        >
          Rhythm Explorer
        </button>
        <button
          className={`tab-button ${activeTab === 'polyrhythm' ? 'active' : ''}`}
          onClick={() => setActiveTab('polyrhythm')}
        >
          Polyrhythm
        </button>
        <button
          className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced Subdivisions
        </button>
      </div>

      {/* Sticky Controls - Shared across all tabs */}
      <StickyControls
        bpm={sharedBpm}
        setBpm={setSharedBpm}
        isPlaying={sharedIsPlaying}
        onPlayStop={() => {}}
        onClear={() => {}}
        onTap={handleTap}
      />

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'rhythmExplorer' && (
          <RhythmExplorer
            sharedBpm={sharedBpm}
            setSharedBpm={setSharedBpm}
            sharedIsPlaying={sharedIsPlaying}
            setSharedIsPlaying={setSharedIsPlaying}
          />
        )}
        {activeTab === 'polyrhythm' && (
          <Polyrhythm
            sharedBpm={sharedBpm}
            setSharedBpm={setSharedBpm}
            sharedIsPlaying={sharedIsPlaying}
            setSharedIsPlaying={setSharedIsPlaying}
          />
        )}
        {activeTab === 'advanced' && (
          <AdvancedSubdivisions
            sharedBpm={sharedBpm}
            setSharedBpm={setSharedBpm}
            sharedIsPlaying={sharedIsPlaying}
            setSharedIsPlaying={setSharedIsPlaying}
          />
        )}
      </div>
    </div>
  );
};

export default Exercise4;
