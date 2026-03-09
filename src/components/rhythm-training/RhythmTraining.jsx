/**
 * RhythmTraining — main container
 *
 * Holds shared settings (tempo, bars, level, sound) and two tabs:
 *   1. RhythmDictation   (הכתבה קצבית)
 *   2. CallAndResponse   (שאלה ותשובה)
 *
 * Settings are passed down as props; each tab manages its own exercise state.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RhythmDictation from './RhythmDictation';
import CallAndResponse from './CallAndResponse';
import rhythmAudio from '../../utils/rhythmTrainingAudio';
import {
  DEFAULT_RHYTHM_TRAINING_SETTINGS,
  CHROMATIC_NOTES_SHARP,
  NUM_BARS_OPTIONS,
  BPM_MIN,
  BPM_MAX,
} from '../../constants/rhythmTrainingDefaults';
import './RhythmTraining.css';

const TABS = [
  { id: 'dictation',    label: 'Rhythm Dictation', sub: 'הכתבה קצבית' },
  { id: 'callResponse', label: 'Call & Response',   sub: 'שאלה ותשובה' },
];

export default function RhythmTraining() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dictation');
  const [settings, setSettings] = useState(DEFAULT_RHYTHM_TRAINING_SETTINGS);
  const [exerciseActive, setExerciseActive] = useState(false);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleTabChange = (tabId) => {
    if (exerciseActive) return; // don't allow tab switch mid-exercise
    rhythmAudio.stop();
    setActiveTab(tabId);
  };

  const handleBack = () => {
    rhythmAudio.stop();
    navigate('/');
  };

  return (
    <div className="rt-page">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="rt-header">
        <button className="rt-back-btn" onClick={handleBack}>←</button>
        <div className="rt-header-titles">
          <h1>🥁 Rhythm Training</h1>
          <p>אימון קצב</p>
        </div>
      </header>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="rt-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`rt-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className="rt-tab-name">{tab.label}</span>
            <span className="rt-tab-sub">{tab.sub}</span>
          </button>
        ))}
      </div>

      {/* ── Content area ─────────────────────────────────────────── */}
      <div className="rt-content">

        {/* ── Shared settings panel ──────────────────────────────── */}
        <SettingsPanel
          settings={settings}
          updateSetting={updateSetting}
          locked={exerciseActive}
        />

        {/* ── Active tab ────────────────────────────────────────── */}
        {activeTab === 'dictation' && (
          <RhythmDictation
            settings={settings}
            onActiveChange={setExerciseActive}
          />
        )}
        {activeTab === 'callResponse' && (
          <CallAndResponse
            settings={settings}
            onActiveChange={setExerciseActive}
          />
        )}

      </div>
    </div>
  );
}

// ─── Shared Settings Panel ────────────────────────────────────────────────

function SettingsPanel({ settings, updateSetting, locked }) {
  const { bpm, numBars, level, soundChoice, bassNote } = settings;

  return (
    <div className={`rt-settings ${locked ? 'locked' : ''}`}>

      {/* Tempo */}
      <div className="rt-field">
        <span className="rt-label">טמפו</span>
        <div className="rt-slider-row">
          <input
            type="range"
            min={BPM_MIN}
            max={BPM_MAX}
            step={5}
            value={bpm}
            className="rt-slider"
            onChange={e => updateSetting('bpm', parseInt(e.target.value))}
          />
          <span className="rt-slider-val">{bpm} BPM</span>
        </div>
      </div>

      {/* Number of bars */}
      <div className="rt-field">
        <span className="rt-label">מספר תיבות</span>
        <div className="rt-btn-group">
          {NUM_BARS_OPTIONS.map(n => (
            <button
              key={n}
              className={`rt-opt-btn ${numBars === n ? 'active' : ''}`}
              onClick={() => updateSetting('numBars', n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty level */}
      <div className="rt-field">
        <span className="rt-label">רמת קושי</span>
        <div className="rt-level-group">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
            <button
              key={l}
              className={`rt-level-btn ${level === l ? 'active' : ''}`}
              onClick={() => updateSetting('level', l)}
            >
              {l}
              {(l === 5 || l === 6) && <span className="rt-level-badge">³</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Sound choice */}
      <div className="rt-field">
        <span className="rt-label">צליל פטרן</span>
        <div className="rt-btn-group">
          {['woodblock', 'bass', 'drums'].map(s => (
            <button
              key={s}
              className={`rt-opt-btn ${soundChoice === s ? 'active' : ''}`}
              onClick={() => updateSetting('soundChoice', s)}
            >
              {{ woodblock: 'Woodblock', bass: 'Bass', drums: 'Drums' }[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Bass note selector (only for bass sound) */}
      {soundChoice === 'bass' && (
        <div className="rt-field">
          <span className="rt-label">תו בסיס</span>
          <div className="rt-note-row">
            {CHROMATIC_NOTES_SHARP.map(n => (
              <button
                key={n}
                className={`rt-note-btn ${bassNote === n ? 'active' : ''}`}
                onClick={() => updateSetting('bassNote', n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
