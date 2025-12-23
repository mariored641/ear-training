import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import RhythmExplorer from './RhythmExplorer';
import './Exercise4.css';

const Exercise4 = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('rhythmExplorer');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleStop = () => {
    navigate('/');
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
          disabled
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          Polyrhythm (Coming Soon)
        </button>
        <button
          className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
          disabled
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          Advanced (Coming Soon)
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'rhythmExplorer' && <RhythmExplorer />}
        {activeTab === 'polyrhythm' && <div>Polyrhythm - Coming Soon</div>}
        {activeTab === 'advanced' && <div>Advanced Subdivisions - Coming Soon</div>}
      </div>
    </div>
  );
};

export default Exercise4;
