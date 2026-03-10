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

const LEVEL_DESCRIPTIONS = [
  { level: 1, label: 'רמה 1', desc: 'רבעיות' },
  { level: 2, label: 'רמה 2', desc: 'שמיניות' },
  { level: 3, label: 'רמה 3', desc: 'סינקופות' },
  { level: 4, label: 'רמה 4', desc: 'שש-עשרות' },
  { level: 5, label: 'רמה 5 ³', desc: 'שלישיות (♩)' },
  { level: 6, label: 'רמה 6 ³', desc: 'שלישיות (𝅗𝅥/𝅝)' },
  { level: 7, label: 'רמה 7', desc: 'חמישיות/שביעיות' },
  { level: 8, label: 'רמה 8', desc: 'פוליריתם' },
];

const NUM_BARS_LABELS = { 1: 'תיבה 1', 2: '2 תיבות', 4: '4 תיבות' };

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
        <div className="rt-header-left">
          <button className="rt-back-btn" onClick={handleBack}>←</button>
        </div>
        <div className="rt-header-center">
          <h1 className="rt-title">🥁 Rhythm Training</h1>
          <p className="rt-subtitle">אימון קצב</p>
        </div>
        <div className="rt-header-right" />
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

const NUM_QUESTIONS_OPTIONS = [5, 10, 20, 0]; // 0 = unlimited

function SettingsPanel({ settings, updateSetting, locked }) {
  const { bpm, numBars, level, soundChoice, bassNote, numQuestions } = settings;

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
              {NUM_BARS_LABELS[n] || n}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty level */}
      <div className="rt-field">
        <span className="rt-label">רמת קושי</span>
        <div className="rt-level-grid">
          {LEVEL_DESCRIPTIONS.map(({ level: l, label, desc }) => (
            <button
              key={l}
              className={`rt-level-bar ${level === l ? 'active' : ''}`}
              onClick={() => updateSetting('level', l)}
            >
              <span className="rt-level-bar-name">{label}</span>
              <span className="rt-level-bar-desc">{desc}</span>
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

      {/* Number of questions */}
      <div className="rt-field">
        <span className="rt-label">מספר שאלות</span>
        <div className="rt-btn-group">
          {NUM_QUESTIONS_OPTIONS.map(n => (
            <button
              key={n}
              className={`rt-opt-btn ${numQuestions === n ? 'active' : ''}`}
              onClick={() => updateSetting('numQuestions', n)}
            >
              {n === 0 ? '∞' : n}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
