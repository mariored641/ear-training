import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import RhythmAudioPlayer from '../../utils/RhythmAudioPlayer';
import {
  DEFAULT_RHYTHM_EXPLORER,
  CELL_STATES,
  SUBDIVISIONS,
  TIME_SIGNATURES,
  PRESET_TYPES
} from '../../constants/exercise4Defaults';
import { getAllPresets, savePreset } from '../../utils/presetManager';
import CellIcon from './CellIcon';
import useRhythmPlayback from './useRhythmPlayback';
import { sequentialPattern } from '../../utils/rhythm/patterns';

const RhythmExplorer = forwardRef(({ sharedBpm, setSharedBpm, sharedIsPlaying, setSharedIsPlaying, sharedSoundSet, setSharedSoundSet }, ref) => {
  const { t } = useTranslation();
  const [beats, setBeats] = useState(DEFAULT_RHYTHM_EXPLORER.beats);
  const [subdivision, setSubdivision] = useState(DEFAULT_RHYTHM_EXPLORER.subdivision);
  const bpm = sharedBpm;
  const setBpm = setSharedBpm;
  const [timeSignature, setTimeSignature] = useState(DEFAULT_RHYTHM_EXPLORER.timeSignature);
  const [grid, setGrid] = useState([]);
  const isPlaying = sharedIsPlaying;
  const setIsPlaying = setSharedIsPlaying;
  const [showSubdivisionModal, setShowSubdivisionModal] = useState(false);
  const [showLoadPresetModal, setShowLoadPresetModal] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [allPresets, setAllPresets] = useState({ builtIn: [], local: [], global: [], all: [] });
  const [presetName, setPresetName] = useState('');
  const [saveAsGlobal, setSaveAsGlobal] = useState(false);
  const [globalPassword, setGlobalPassword] = useState('');
  const [saveError, setSaveError] = useState('');
  const soundSet = sharedSoundSet;
  const setSoundSet = setSharedSoundSet;

  const pattern = useMemo(() => sequentialPattern(grid.map(cells => ({ length: 1, cells }))), [grid]);
  const { currentCells, playbackError, handlePlayStop } = useRhythmPlayback(pattern, bpm, soundSet, isPlaying, setIsPlaying);

  // Initialize grid
  useEffect(() => {
    initializeGrid();
  }, [beats, subdivision]);

  const initializeGrid = () => {
    setGrid(prevGrid => {
      const newGrid = [];

      for (let i = 0; i < beats; i++) {
        const row = [];
        for (let j = 0; j < subdivision; j++) {
          // If this cell existed before, keep its state
          if (prevGrid[i] && prevGrid[i][j] !== undefined) {
            row.push(prevGrid[i][j]);
          } else {
            // New cell - initialize to SOFT (hi-hat)
            row.push(CELL_STATES.SOFT);
          }
        }
        newGrid.push(row);
      }

      return newGrid;
    });
  };

  // Toggle cell state
  const toggleCell = (beatIndex, cellIndex) => {
    setGrid(prevGrid => {
      // CRITICAL: Deep copy the grid (copy each row individually)
      const newGrid = prevGrid.map(row => [...row]);
      const currentState = newGrid[beatIndex][cellIndex];

      // Cycle through states: accent (dark) -> normal (medium) -> soft (light) -> mute (white) -> accent
      const stateOrder = [CELL_STATES.ACCENT, CELL_STATES.NORMAL, CELL_STATES.SOFT, CELL_STATES.MUTE];
      const currentIndex = stateOrder.indexOf(currentState);
      const nextIndex = (currentIndex + 1) % stateOrder.length;
      const nextState = stateOrder[nextIndex];

      console.log(`=== CELL TOGGLE ===`);
      console.log(`Position: [${beatIndex}][${cellIndex}]`);
      console.log(`${currentState} (${currentIndex}) → ${nextState} (${nextIndex})`);

      newGrid[beatIndex][cellIndex] = nextState;
      return newGrid;
    });
  };

  // Clear grid - reset to 4/4
  const handleClear = () => {
    setBeats(4);
    setSubdivision(1);
    setTimeSignature('4/4');
    setBpm(90);
  };

  // Get time signature preset configuration
  const getTimeSignaturePreset = (sig) => {
    const presets = {
      // Simple Meters
      '1/4': {
        beats: 1,
        subdivision: 1,
        pattern: [CELL_STATES.ACCENT]  // Kick
      },
      '2/4': {
        beats: 2,
        subdivision: 1,
        pattern: [CELL_STATES.ACCENT, CELL_STATES.NORMAL]  // Kick-Snare
      },
      '3/4': {
        beats: 3,
        subdivision: 1,
        pattern: [CELL_STATES.ACCENT, CELL_STATES.SOFT, CELL_STATES.SOFT]  // Kick-HiHat-HiHat
      },
      '4/4': {
        beats: 4,
        subdivision: 1,
        pattern: [CELL_STATES.ACCENT, CELL_STATES.SOFT, CELL_STATES.NORMAL, CELL_STATES.SOFT]  // Kick-HiHat-Snare-HiHat
      },

      // Compound Meters
      '6/8': {
        beats: 2,
        subdivision: 3,
        pattern: [
          [CELL_STATES.ACCENT, CELL_STATES.SOFT, CELL_STATES.SOFT],  // Beat 1: Kick-HiHat-HiHat
          [CELL_STATES.NORMAL, CELL_STATES.SOFT, CELL_STATES.SOFT]   // Beat 2: Snare-HiHat-HiHat
        ]
      },
      '9/8': {
        beats: 3,
        subdivision: 3,
        pattern: [
          [CELL_STATES.ACCENT, CELL_STATES.SOFT, CELL_STATES.SOFT],  // Beat 1: Kick-HiHat-HiHat
          [CELL_STATES.SOFT, CELL_STATES.SOFT, CELL_STATES.SOFT],    // Beat 2: HiHat-HiHat-HiHat
          [CELL_STATES.NORMAL, CELL_STATES.SOFT, CELL_STATES.SOFT]   // Beat 3: Snare-HiHat-HiHat
        ]
      },
      '12/8': {
        beats: 4,
        subdivision: 3,
        pattern: [
          [CELL_STATES.ACCENT, CELL_STATES.SOFT, CELL_STATES.SOFT],  // Beat 1: Kick-HiHat-HiHat
          [CELL_STATES.SOFT, CELL_STATES.SOFT, CELL_STATES.SOFT],    // Beat 2: HiHat-HiHat-HiHat
          [CELL_STATES.NORMAL, CELL_STATES.SOFT, CELL_STATES.SOFT],  // Beat 3: Snare-HiHat-HiHat
          [CELL_STATES.SOFT, CELL_STATES.SOFT, CELL_STATES.SOFT]     // Beat 4: HiHat-HiHat-HiHat
        ]
      }
    };

    return presets[sig] || null;
  };

  // Load all presets when modal opens
  const loadAllPresets = async () => {
    const presets = await getAllPresets(PRESET_TYPES.RHYTHM_EXPLORER, []);
    setAllPresets(presets);
  };

  // Load a preset pattern
  const loadPreset = (preset) => {
    // Stop playback if playing
    if (isPlaying) {
      RhythmAudioPlayer.stop();
      setIsPlaying(false);
    }

    // Apply preset settings
    setBeats(preset.beats);
    setSubdivision(preset.subdivision);
    setTimeSignature(preset.timeSignature);
    setBpm(preset.bpm);

    // Apply the grid pattern
    setTimeout(() => {
      setGrid(preset.grid.map(row => [...row])); // Deep copy the grid
    }, 50);

    // Close modal
    setShowLoadPresetModal(false);
  };

  // Save current pattern as preset
  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      setSaveError(t('rhythm.presetNameRequired'));
      return;
    }

    const preset = {
      name: presetName.trim(),
      beats,
      subdivision,
      timeSignature,
      bpm,
      grid: grid.map(row => [...row])
    };

    const result = await savePreset(
      PRESET_TYPES.RHYTHM_EXPLORER,
      preset,
      saveAsGlobal,
      globalPassword
    );

    if (result.success) {
      // Reset form
      setPresetName('');
      setSaveAsGlobal(false);
      setGlobalPassword('');
      setSaveError('');
      setShowSavePresetModal(false);

      // Show success message
      alert(t('rhythm.presetSaved', { name: preset.name }));
    } else {
      setSaveError(result.error || t('rhythm.presetSaveFailed'));
    }
  };

  // Time signature change with preset pattern
  const handleTimeSignatureChange = (sig) => {
    setTimeSignature(sig);

    // Get preset configuration for this time signature
    const preset = getTimeSignaturePreset(sig);

    if (preset) {
      // Apply preset beats and subdivision
      setBeats(preset.beats);
      setSubdivision(preset.subdivision);

      // Apply preset pattern
      setTimeout(() => {
        setGrid(prevGrid => {
          const newGrid = [];

          for (let i = 0; i < preset.beats; i++) {
            const row = [];

            // Check if pattern is 2D (has subdivisions) or 1D (simple)
            const beatPattern = Array.isArray(preset.pattern[0])
              ? preset.pattern[i]  // 2D pattern - get the row for this beat
              : null;

            for (let j = 0; j < preset.subdivision; j++) {
              if (beatPattern) {
                // 2D pattern with subdivisions (like 6/8)
                row.push(beatPattern[j] || CELL_STATES.NORMAL);
              } else {
                // 1D pattern (like 4/4, 3/4)
                if (j === 0 && preset.pattern.length > 0) {
                  row.push(preset.pattern[i] || CELL_STATES.NORMAL);
                } else {
                  row.push(CELL_STATES.NORMAL);
                }
              }
            }
            newGrid.push(row);
          }
          return newGrid;
        });
      }, 50);
    }
  };

  // Get subdivision icon
  const getSubdivisionIcon = () => {
    const sub = SUBDIVISIONS.find(s => s.value === subdivision);
    return sub ? sub.icon : '♩';
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    handlePlayStop,
    handleClear
  }));

  return (
    <div className="rhythm-explorer">
      {playbackError && <p role="alert">{t('rhythm.playbackError')}</p>}
      {/* Left Panel - Beat Grid */}
      <div className="rhythm-left-panel">
        <div className="beat-grid">
          {grid.map((beat, beatIndex) => (
            <div key={beatIndex} className="beat-row">
              <div className="beat-label">Beat {beatIndex + 1}:</div>
              <div className="beat-cells">
                {beat.map((cellState, cellIndex) => (
                  <div
                    key={cellIndex}
                    className={`beat-cell rc rc-${cellState} ${
                      currentCells[beatIndex] === cellIndex ? 'playing' : ''
                    }`}
                    data-state={cellState}
                    onClick={() => toggleCell(beatIndex, cellIndex)}
                  >
                    <CellIcon state={cellState} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Controls */}
      <div className="rhythm-right-panel">
        {/* Beats and Subdivision Control */}
        <div className="control-section">
          {/* Beats Control */}
          <div className="control-group">
            <div className="beats-control">
              <div className="beats-display">{t('rhythm.beats')}: {beats}</div>
              <input
                type="range"
                min="1"
                max="16"
                value={beats}
                onChange={(e) => setBeats(parseInt(e.target.value))}
                className="beats-slider"
              />
              <div className="control-buttons">
                <button
                  className="control-btn"
                  onClick={() => setBeats(Math.max(1, beats - 1))}
                >
                  -
                </button>
                <button
                  className="control-btn"
                  onClick={() => setBeats(Math.min(16, beats + 1))}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Subdivision Control */}
          <div className="control-group subdivision-group">
            <div className="subdivision-label">{t('rhythm.subdivision')}:</div>
            <button
              className="control-btn subdivision-trigger"
              onClick={() => setShowSubdivisionModal(true)}
            >
              {getSubdivisionIcon()}
            </button>
          </div>
        </div>

        {/* Time Signature Selector */}
        <div className="time-signature-selector">
          <div className="control-label">{t('rhythm.timeSignature')}</div>
          <div className="time-sig-grid">
            {TIME_SIGNATURES.map((sig) => (
              <button
                key={sig}
                className={`time-sig-btn ${timeSignature === sig ? 'active' : ''}`}
                onClick={() => handleTimeSignatureChange(sig)}
              >
                {sig}
              </button>
            ))}
          </div>
        </div>

        {/* Presets Buttons */}
        <div className="presets-section">
          <button
            className="presets-btn"
            onClick={() => {
              loadAllPresets();
              setShowLoadPresetModal(true);
            }}
          >
            📋 {t('rhythm.loadPreset')}
          </button>
          <button
            className="presets-btn save-btn"
            onClick={() => setShowSavePresetModal(true)}
          >
            💾 {t('rhythm.savePreset')}
          </button>
        </div>
      </div>
      {/* End Right Panel */}

      {/* Subdivision Modal */}
      {showSubdivisionModal && (
        <div className="modal-overlay" onClick={() => setShowSubdivisionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{t('rhythm.subdivisions')}: {subdivision}</div>
            <div className="subdivision-options">
              {SUBDIVISIONS.map((sub) => (
                <button
                  key={sub.value}
                  className={`subdivision-btn ${subdivision === sub.value ? 'active' : ''}`}
                  onClick={() => {
                    setSubdivision(sub.value);
                    setShowSubdivisionModal(false);
                  }}
                >
                  <div className="subdivision-icon">{sub.icon}</div>
                  <div className="subdivision-number">{sub.value}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Load Presets Modal */}
      {showLoadPresetModal && (
        <div className="modal-overlay" onClick={() => setShowLoadPresetModal(false)}>
          <div className="modal-content presets-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{t('rhythm.loadRhythmPreset')}</div>
            <div className="presets-list">
              {allPresets.all.length === 0 ? (
                <div className="no-presets">
                  {t('rhythm.noPresets')}
                </div>
              ) : (
                <>
                  {allPresets.global.length > 0 && (
                    <div className="preset-category">
                      <div className="preset-category-title">🌍 {t('rhythm.globalPresets')}</div>
                      {allPresets.global.map((preset) => (
                        <button
                          key={preset.id}
                          className="preset-item"
                          onClick={() => loadPreset(preset)}
                        >
                          <div className="preset-name">{preset.name}</div>
                          <div className="preset-details">
                            {preset.timeSignature} • {t('rhythm.beatsCount', { count: preset.beats })} • {preset.bpm} BPM
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {allPresets.local.length > 0 && (
                    <div className="preset-category">
                      <div className="preset-category-title">💾 {t('rhythm.myPresets')}</div>
                      {allPresets.local.map((preset) => (
                        <button
                          key={preset.id}
                          className="preset-item"
                          onClick={() => loadPreset(preset)}
                        >
                          <div className="preset-name">{preset.name}</div>
                          <div className="preset-details">
                            {preset.timeSignature} • {t('rhythm.beatsCount', { count: preset.beats })} • {preset.bpm} BPM
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <button
              className="modal-close-btn"
              onClick={() => setShowLoadPresetModal(false)}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="modal-overlay" onClick={() => setShowSavePresetModal(false)}>
          <div className="modal-content save-preset-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{t('rhythm.saveRhythmPreset')}</div>

            <div className="save-preset-form">
              {/* Preset Name */}
              <div className="form-group">
                <label htmlFor="preset-name">{t('rhythm.presetName')}:</label>
                <input
                  id="preset-name"
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder={t('rhythm.enterPresetName')}
                  className="preset-name-input"
                />
              </div>

              {/* Save Type */}
              <div className="form-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={!saveAsGlobal}
                    onChange={() => setSaveAsGlobal(false)}
                  />
                  <span>💾 {t('rhythm.saveLocal')}</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={saveAsGlobal}
                    onChange={() => setSaveAsGlobal(true)}
                  />
                  <span>🌍 {t('rhythm.saveGlobal')}</span>
                </label>
              </div>

              {/* Password (if global) */}
              {saveAsGlobal && (
                <div className="form-group">
                  <label htmlFor="global-password">{t('rhythm.globalPassword')}:</label>
                  <input
                    id="global-password"
                    type="password"
                    value={globalPassword}
                    onChange={(e) => setGlobalPassword(e.target.value)}
                    placeholder={t('rhythm.enterPassword')}
                    className="password-input"
                  />
                </div>
              )}

              {/* Error Message */}
              {saveError && (
                <div className="error-message">{saveError}</div>
              )}

              {/* Action Buttons */}
              <div className="modal-actions">
                <button
                  className="modal-action-btn save"
                  onClick={handleSavePreset}
                >
                  {t('common.save')}
                </button>
                <button
                  className="modal-action-btn cancel"
                  onClick={() => {
                    setShowSavePresetModal(false);
                    setPresetName('');
                    setSaveAsGlobal(false);
                    setGlobalPassword('');
                    setSaveError('');
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default RhythmExplorer;
