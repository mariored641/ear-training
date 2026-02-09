import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as Tone from 'tone';
import RhythmAudioPlayer from '../../utils/RhythmAudioPlayer';
import {
  DEFAULT_ADVANCED,
  CELL_STATES,
  DIVISION_OPTIONS,
  NOTE_ICONS,
  BPM_MIN,
  BPM_MAX,
  TEMPO_MARKINGS,
  PRESET_TYPES
} from '../../constants/exercise4Defaults';
import { getAllPresets, savePreset } from '../../utils/presetManager';

const AdvancedSubdivisions = forwardRef(({ sharedBpm, setSharedBpm, sharedIsPlaying, setSharedIsPlaying, sharedSoundSet }, ref) => {
  const [beats, setBeats] = useState([]);
  const bpm = sharedBpm;
  const setBpm = setSharedBpm;
  const isPlaying = sharedIsPlaying;
  const setIsPlaying = setSharedIsPlaying;
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentCell, setCurrentCell] = useState(-1);
  const [tapTimes, setTapTimes] = useState([]);
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

  // Play/Stop
  const handlePlayStop = async () => {
    if (isPlaying) {
      RhythmAudioPlayer.stop();
      setIsPlaying(false);
      setCurrentBeat(-1);
      setCurrentCell(-1);
    } else {
      await RhythmAudioPlayer.init();
      playPattern();
      setIsPlaying(true);
    }
  };

  const playPattern = useCallback(() => {
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;

    const oneBeatDuration = 60 / bpm; // Duration of 1 beat in seconds
    let time = 0;

    beats.forEach((beat, beatIndex) => {
      const beatTotalDuration = oneBeatDuration * beat.length;
      const cellDuration = beatTotalDuration / beat.division;

      beat.cells.forEach((cellState, cellIndex) => {
        Tone.Transport.schedule((scheduleTime) => {
          RhythmAudioPlayer.playCell(cellState, scheduleTime, cellIndex === 0, sharedSoundSet);
          setCurrentBeat(beatIndex);
          setCurrentCell(cellIndex);

          setTimeout(() => {
            setCurrentBeat(-1);
            setCurrentCell(-1);
          }, cellDuration * 1000 * 0.5);
        }, time);

        time += cellDuration;
      });
    });

    // Set up looping
    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = time;
    Tone.Transport.start();
  }, [beats, bpm, sharedSoundSet]);

  // Live updates during playback
  useEffect(() => {
    if (isPlaying) {
      RhythmAudioPlayer.stop();
      Tone.Transport.cancel();
      playPattern();
    }
  }, [beats, bpm, sharedSoundSet]);

  // Clear - reset to default
  const handleClear = () => {
    initializeBeats();
  };

  // Tap tempo
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

      if (newBpm >= BPM_MIN && newBpm <= BPM_MAX) {
        setBpm(newBpm);
      }
    }

    setTimeout(() => {
      setTapTimes(prev => prev.filter(t => Date.now() - t < 3000));
    }, 3000);
  };

  // Get tempo marking
  const getTempoMarking = () => {
    for (const marking of TEMPO_MARKINGS) {
      if (bpm >= marking.min && bpm <= marking.max) {
        return marking.name;
      }
    }
    return 'Andante';
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
      setCurrentBeat(-1);
      setCurrentCell(-1);
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
      setSaveError('Please enter a preset name');
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
      alert(`Preset "${preset.name}" saved successfully!`);
    } else {
      setSaveError(result.error || 'Failed to save preset');
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    handlePlayStop,
    handleClear
  }));

  return (
    <div className="advanced-subdivisions">
      {/* Header with Add Beat and Total */}
      <div className="advanced-header">
        <button className="add-beat-btn" onClick={addBeat}>
          + Add Beat
        </button>
        <button className="presets-btn-inline" onClick={() => {
          loadAllPresets();
          setShowLoadPresetModal(true);
        }}>
          📋 Load Preset
        </button>
        <button className="presets-btn-inline save-btn" onClick={() => setShowSavePresetModal(true)}>
          💾 Save Preset
        </button>
        <div className="total-beats-header">
          Total: {getTotalBeats()} beats
        </div>
      </div>

      {/* Beat Cards Grid */}
      <div className="beat-cards-container">
        {beats.map((beat, beatIndex) => (
          <div key={beatIndex} className="beat-card">
            {/* Card Header */}
            <div className="beat-card-header">
              <span className="note-icon-header">{getNoteIcon(beat.length)}</span>
              <span className="beat-label">Beat {beatIndex + 1}</span>
            </div>

            {/* Card Controls */}
            <div className="beat-card-controls">
              <div className="control-group">
                <label>Length:</label>
                <input
                  type="number"
                  min="0.25"
                  max="16"
                  step="0.25"
                  value={beat.length}
                  onChange={(e) => updateLength(beatIndex, e.target.value)}
                  className="length-input"
                />
                <span className="unit">beats</span>
              </div>

              <div className="control-group">
                <label>Division:</label>
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
                  className={`cell cell-${cellState} ${
                    currentBeat === beatIndex && currentCell === cellIndex ? 'playing' : ''
                  }`}
                  onClick={() => toggleCell(beatIndex, cellIndex)}
                />
              ))}
            </div>

            {/* Card Footer */}
            <div className="beat-card-footer">
              <button
                className="delete-btn"
                onClick={() => deleteBeat(beatIndex)}
                disabled={beats.length === 1}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Load Presets Modal */}
      {showLoadPresetModal && (
        <div className="modal-overlay" onClick={() => setShowLoadPresetModal(false)}>
          <div className="modal-content presets-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Load Advanced Subdivision Preset</div>
            <div className="presets-list">
              {allPresets.all.length === 0 ? (
                <div className="no-presets">
                  No presets available. Create your first preset by clicking "Save Preset"!
                </div>
              ) : (
                <>
                  {allPresets.global.length > 0 && (
                    <div className="preset-category">
                      <div className="preset-category-title">🌍 Global Presets (Everyone)</div>
                      {allPresets.global.map((preset) => (
                        <button
                          key={preset.id}
                          className="preset-item"
                          onClick={() => loadPreset(preset)}
                        >
                          <div className="preset-name">{preset.name}</div>
                          <div className="preset-details">
                            {preset.beats.length} beats • {preset.bpm} BPM
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {allPresets.local.length > 0 && (
                    <div className="preset-category">
                      <div className="preset-category-title">💾 My Presets (Local)</div>
                      {allPresets.local.map((preset) => (
                        <button
                          key={preset.id}
                          className="preset-item"
                          onClick={() => loadPreset(preset)}
                        >
                          <div className="preset-name">{preset.name}</div>
                          <div className="preset-details">
                            {preset.beats.length} beats • {preset.bpm} BPM
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
              Close
            </button>
          </div>
        </div>
      )}

      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="modal-overlay" onClick={() => setShowSavePresetModal(false)}>
          <div className="modal-content save-preset-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Save Advanced Subdivision Preset</div>

            <div className="save-preset-form">
              {/* Preset Name */}
              <div className="form-group">
                <label htmlFor="preset-name-adv">Preset Name:</label>
                <input
                  id="preset-name-adv"
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Enter preset name..."
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
                  <span>💾 Save only for me (Local)</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={saveAsGlobal}
                    onChange={() => setSaveAsGlobal(true)}
                  />
                  <span>🌍 Save for everyone (Global)</span>
                </label>
              </div>

              {/* Password (if global) */}
              {saveAsGlobal && (
                <div className="form-group">
                  <label htmlFor="global-password-adv">Password (required for global):</label>
                  <input
                    id="global-password-adv"
                    type="password"
                    value={globalPassword}
                    onChange={(e) => setGlobalPassword(e.target.value)}
                    placeholder="Enter password..."
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
                  Save
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
                  Cancel
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
