import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import RhythmAudioPlayer from '../../utils/RhythmAudioPlayer';
import {
  DEFAULT_ADVANCED,
  CELL_STATES,
  DIVISION_OPTIONS,
  NOTE_ICONS,
  PRESET_TYPES
} from '../../constants/exercise4Defaults';
import { getAllPresets, savePreset } from '../../utils/presetManager';
import CellIcon from './CellIcon';
import useRhythmPlayback from './useRhythmPlayback';
import { sequentialPattern } from '../../utils/rhythm/patterns';

const AdvancedSubdivisions = forwardRef(({ sharedBpm, setSharedBpm, sharedIsPlaying, setSharedIsPlaying, sharedSoundSet }, ref) => {
  const { t } = useTranslation();
  const [beats, setBeats] = useState([]);
  const bpm = sharedBpm;
  const setBpm = setSharedBpm;
  const isPlaying = sharedIsPlaying;
  const setIsPlaying = setSharedIsPlaying;
  const [showLoadPresetModal, setShowLoadPresetModal] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [allPresets, setAllPresets] = useState({ builtIn: [], local: [], global: [], all: [] });
  const [presetName, setPresetName] = useState('');
  const [saveAsGlobal, setSaveAsGlobal] = useState(false);
  const [globalPassword, setGlobalPassword] = useState('');
  const [saveError, setSaveError] = useState('');

  // Initialize beats
  useEffect(() => {
    initializeBeats();
  }, []);

  const initializeBeats = () => {
    setBeats(DEFAULT_ADVANCED.beats.map(beat => {
      const cells = [];
      for (let i = 0; i < beat.division; i++) {
        // First cell is ACCENT, rest are SOFT
        cells.push(i === 0 ? CELL_STATES.ACCENT : CELL_STATES.SOFT);
      }
      return {
        length: beat.length,
        division: beat.division,
        cells: cells
      };
    }));
  };

  // Add new beat
  const addBeat = () => {
    setBeats(prev => [
      ...prev,
      {
        length: 1,
        division: 1,
        cells: [CELL_STATES.ACCENT]
      }
    ]);
  };

  // Delete beat
  const deleteBeat = (beatIndex) => {
    if (beats.length === 1) return; // Keep at least one beat
    setBeats(prev => prev.filter((_, index) => index !== beatIndex));
  };

  // Update beat length
  const updateLength = (beatIndex, newLength) => {
    const length = Math.max(0.25, Math.min(8, parseFloat(newLength) || 1));
    setBeats(prev => {
      const newBeats = [...prev];
      newBeats[beatIndex] = { ...newBeats[beatIndex], length };
      return newBeats;
    });
  };

  // Update beat division
  const updateDivision = (beatIndex, newDivision) => {
    setBeats(prev => {
      const newBeats = [...prev];
      const beat = newBeats[beatIndex];
      const oldCells = beat.cells;
      const newCells = [];

      for (let i = 0; i < newDivision; i++) {
        if (oldCells[i] !== undefined) {
          // Keep existing cell state if available
          newCells.push(oldCells[i]);
        } else {
          // New cells: first cell is ACCENT, additional cells are SOFT
          newCells.push(i === 0 ? CELL_STATES.ACCENT : CELL_STATES.SOFT);
        }
      }

      newBeats[beatIndex] = {
        ...beat,
        division: newDivision,
        cells: newCells
      };
      return newBeats;
    });
  };

  // Toggle cell state
  const toggleCell = (beatIndex, cellIndex) => {
    setBeats(prev => {
      const newBeats = [...prev];
      const beat = newBeats[beatIndex];
      const currentState = beat.cells[cellIndex];

      const stateOrder = [CELL_STATES.ACCENT, CELL_STATES.NORMAL, CELL_STATES.SOFT, CELL_STATES.MUTE];
      const currentIndex = stateOrder.indexOf(currentState);
      const nextIndex = (currentIndex + 1) % stateOrder.length;

      const newCells = [...beat.cells];
      newCells[cellIndex] = stateOrder[nextIndex];

      newBeats[beatIndex] = { ...beat, cells: newCells };
      return newBeats;
    });
  };

  const pattern = useMemo(() => sequentialPattern(beats), [beats]);
  const { currentCells, playbackError, handlePlayStop } = useRhythmPlayback(pattern, bpm, sharedSoundSet, isPlaying, setIsPlaying);

  // Clear - reset to default
  const handleClear = () => {
    initializeBeats();
  };

  // Get note icon for length
  const getNoteIcon = (length) => {
    return NOTE_ICONS[length] || '♩';
  };

  // Calculate total beats
  const getTotalBeats = () => {
    return beats.reduce((sum, beat) => sum + beat.length, 0);
  };

  // Load all presets when modal opens
  const loadAllPresets = async () => {
    const presets = await getAllPresets(PRESET_TYPES.ADVANCED_SUBDIVISIONS, []);
    setAllPresets(presets);
  };

  // Load a preset pattern
  const loadPreset = (preset) => {
    // Stop playback if playing
    if (isPlaying) {
      RhythmAudioPlayer.stop();
      setIsPlaying(false);
    }

    // Apply preset BPM
    setBpm(preset.bpm);

    // Apply the beats pattern (deep copy)
    setBeats(preset.beats.map(beat => ({
      ...beat,
      cells: [...beat.cells]
    })));

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
      bpm,
      beats: beats.map(beat => ({
        length: beat.length,
        division: beat.division,
        cells: [...beat.cells]
      }))
    };

    const result = await savePreset(
      PRESET_TYPES.ADVANCED_SUBDIVISIONS,
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

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    handlePlayStop,
    handleClear
  }));

  return (
    <div className="advanced-subdivisions">
      {playbackError && <p role="alert">{t('rhythm.playbackError')}</p>}
      {/* Header with Add Beat and Total */}
      <div className="advanced-header">
        <button className="add-beat-btn" onClick={addBeat}>
          + {t('rhythm.addBeat')}
        </button>
        <button className="presets-btn-inline" onClick={() => {
          loadAllPresets();
          setShowLoadPresetModal(true);
        }}>
          📋 {t('rhythm.loadPreset')}
        </button>
        <button className="presets-btn-inline save-btn" onClick={() => setShowSavePresetModal(true)}>
          💾 {t('rhythm.savePreset')}
        </button>
        <div className="total-beats-header">
          {t('rhythm.totalBeats', { count: getTotalBeats() })}
        </div>
      </div>

      {/* Beat Cards Grid */}
      <div className="beat-cards-container">
        {beats.map((beat, beatIndex) => (
          <div key={beatIndex} className="beat-card">
            {/* Card Header */}
            <div className="beat-card-header">
              <span className="note-icon-header">{getNoteIcon(beat.length)}</span>
              <span className="beat-label">{t('rhythm.beat', { number: beatIndex + 1 })}</span>
            </div>

            {/* Card Controls */}
            <div className="beat-card-controls">
              <div className="control-group">
                <label>{t('earTraining.controls.length')}:</label>
                <input
                  type="number"
                  min="0.25"
                  max="16"
                  step="0.25"
                  value={beat.length}
                  onChange={(e) => updateLength(beatIndex, e.target.value)}
                  className="length-input"
                />
                <span className="unit">{t('rhythm.beats')}</span>
              </div>

              <div className="control-group">
                <label>{t('rhythm.division')}:</label>
                <select
                  value={beat.division}
                  onChange={(e) => updateDivision(beatIndex, parseInt(e.target.value))}
                  className="division-select"
                >
                  {DIVISION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cells - Vertical */}
            <div className="beat-card-cells">
              {beat.cells.map((cellState, cellIndex) => (
                <div
                  key={cellIndex}
                  className={`cell rc rc-${cellState} ${
                    currentCells[beatIndex] === cellIndex ? 'playing' : ''
                  }`}
                  onClick={() => toggleCell(beatIndex, cellIndex)}
                >
                  <CellIcon state={cellState} />
                </div>
              ))}
            </div>

            {/* Card Footer */}
            <div className="beat-card-footer">
              <button
                className="delete-btn"
                onClick={() => deleteBeat(beatIndex)}
                disabled={beats.length === 1}
              >
                🗑️ {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Load Presets Modal */}
      {showLoadPresetModal && (
        <div className="modal-overlay" onClick={() => setShowLoadPresetModal(false)}>
          <div className="modal-content presets-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{t('rhythm.loadAdvancedPreset')}</div>
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
                            {t('rhythm.beatsCount', { count: preset.beats.length })} • {preset.bpm} BPM
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
                            {t('rhythm.beatsCount', { count: preset.beats.length })} • {preset.bpm} BPM
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
            <div className="modal-title">{t('rhythm.saveAdvancedPreset')}</div>

            <div className="save-preset-form">
              {/* Preset Name */}
              <div className="form-group">
                <label htmlFor="preset-name-adv">{t('rhythm.presetName')}:</label>
                <input
                  id="preset-name-adv"
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
                  <label htmlFor="global-password-adv">{t('rhythm.globalPassword')}:</label>
                  <input
                    id="global-password-adv"
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

export default AdvancedSubdivisions;
