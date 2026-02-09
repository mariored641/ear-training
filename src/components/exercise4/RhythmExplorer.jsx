import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import * as Tone from 'tone';
import RhythmAudioPlayer from '../../utils/RhythmAudioPlayer';
import {
  DEFAULT_RHYTHM_EXPLORER,
  DEFAULT_EXERCISE4_SETTINGS,
  CELL_STATES,
  SUBDIVISIONS,
  TIME_SIGNATURES,
  BPM_MIN,
  BPM_MAX,
  TEMPO_MARKINGS,
  PRESET_TYPES
} from '../../constants/exercise4Defaults';
import { getAllPresets, savePreset } from '../../utils/presetManager';

const RhythmExplorer = forwardRef(({ sharedBpm, setSharedBpm, sharedIsPlaying, setSharedIsPlaying, sharedSoundSet, setSharedSoundSet }, ref) => {
  const [beats, setBeats] = useState(DEFAULT_RHYTHM_EXPLORER.beats);
  const [subdivision, setSubdivision] = useState(DEFAULT_RHYTHM_EXPLORER.subdivision);
  const bpm = sharedBpm;
  const setBpm = setSharedBpm;
  const [timeSignature, setTimeSignature] = useState(DEFAULT_RHYTHM_EXPLORER.timeSignature);
  const [grid, setGrid] = useState([]);
  const isPlaying = sharedIsPlaying;
  const setIsPlaying = setSharedIsPlaying;
  const [currentCell, setCurrentCell] = useState({ beat: -1, cell: -1 });
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
  const [tapTimes, setTapTimes] = useState([]);

  // Ref to track current position in the loop
  const currentPositionRef = useRef({ beat: 0, cell: 0 });
  const scheduleIdRef = useRef(null);

  // Initialize grid
  useEffect(() => {
    initializeGrid();
  }, [beats, subdivision]);

  // Live updates - restart playback with current position preserved
  useEffect(() => {
    if (isPlaying) {
      // Calculate where we are in the current loop
      const currentBeat = currentCell.beat >= 0 ? currentCell.beat : 0;
      const currentCellIndex = currentCell.cell >= 0 ? currentCell.cell : 0;

      // Restart playback from current position
      RhythmAudioPlayer.stop();
      Tone.Transport.cancel();
      playPatternFromPosition(currentBeat, currentCellIndex);
    }
  }, [grid, bpm, subdivision]);


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

  // Play/Stop
  const handlePlayStop = async () => {
    if (isPlaying) {
      RhythmAudioPlayer.stop();
      setIsPlaying(false);
      setCurrentCell({ beat: -1, cell: -1 });
    } else {
      await RhythmAudioPlayer.init();
      playPattern();
      setIsPlaying(true);
    }
  };

  const playPatternFromPosition = useCallback((startBeat = 0, startCell = 0) => {
    Tone.Transport.bpm.value = bpm;

    const beatDuration = 60 / bpm;
    const cellDuration = beatDuration / subdivision;

    let time = 0;

    // Create flat array of all cells with their metadata
    const allCells = [];
    grid.forEach((beat, beatIndex) => {
      beat.forEach((cellState, cellIndex) => {
        allCells.push({
          beatIndex,
          cellIndex,
          cellState,
          isBeatStart: cellIndex === 0
        });
      });
    });

    if (allCells.length === 0) return;

    // Find starting position index
    const startIndex = allCells.findIndex(
      cell => cell.beatIndex === startBeat && cell.cellIndex === startCell
    );
    const actualStartIndex = startIndex >= 0 ? startIndex : 0;

    // Schedule from current position to end, then from beginning
    // This creates a seamless loop starting from current position
    const reorderedCells = [
      ...allCells.slice(actualStartIndex),
      ...allCells.slice(0, actualStartIndex)
    ];

    reorderedCells.forEach((cell) => {
      Tone.Transport.schedule((scheduleTime) => {
        RhythmAudioPlayer.playCell(cell.cellState, scheduleTime, cell.isBeatStart);

        setCurrentCell({ beat: cell.beatIndex, cell: cell.cellIndex });
        currentPositionRef.current = { beat: cell.beatIndex, cell: cell.cellIndex };

        setTimeout(() => {
          setCurrentCell({ beat: -1, cell: -1 });
        }, cellDuration * 1000 * 0.5);
      }, time);

      time += cellDuration;
    });

    // Set up looping
    const loopDuration = time;
    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = loopDuration;
    Tone.Transport.start();
  }, [grid, bpm, subdivision]);

  const playPattern = useCallback(() => {
    Tone.Transport.cancel();
    playPatternFromPosition(0, 0);
  }, [playPatternFromPosition]);

  // Clear grid - reset to 4/4
  const handleClear = () => {
    setBeats(4);
    setSubdivision(1);
    setTimeSignature('4/4');
    setBpm(90);
  };

  // Tap tempo
  const handleTap = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-4); // Keep last 4 taps
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

    // Reset if too much time passed
    setTimeout(() => {
      setTapTimes(prev => prev.filter(t => Date.now() - t < 3000));
    }, 3000);
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
      setCurrentCell({ beat: -1, cell: -1 });
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
      setSaveError('Please enter a preset name');
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
      alert(`Preset "${preset.name}" saved successfully!`);
    } else {
      setSaveError(result.error || 'Failed to save preset');
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

  // Get tempo marking
  const getTempoMarking = () => {
    for (const marking of TEMPO_MARKINGS) {
      if (bpm >= marking.min && bpm <= marking.max) {
        return marking.name;
      }
    }
    return 'Andante';
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
                    className={`beat-cell beat-cell-${cellState} ${
                      currentCell.beat === beatIndex && currentCell.cell === cellIndex ? 'playing' : ''
                    }`}
                    data-state={cellState}
                    onClick={() => toggleCell(beatIndex, cellIndex)}
                  />
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
              <div className="beats-display">Beats: {beats}</div>
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
            <div className="subdivision-label">Subdivision:</div>
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
          <div className="control-label">Time Signature</div>
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
            📋 Load Preset
          </button>
          <button
            className="presets-btn save-btn"
            onClick={() => setShowSavePresetModal(true)}
          >
            💾 Save Preset
          </button>
        </div>
      </div>
      {/* End Right Panel */}

      {/* Subdivision Modal */}
      {showSubdivisionModal && (
        <div className="modal-overlay" onClick={() => setShowSubdivisionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Subdivisions: {subdivision}</div>
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
            <div className="modal-title">Load Rhythm Preset</div>
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
                            {preset.timeSignature} • {preset.beats} beats • {preset.bpm} BPM
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
                            {preset.timeSignature} • {preset.beats} beats • {preset.bpm} BPM
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
            <div className="modal-title">Save Rhythm Preset</div>

            <div className="save-preset-form">
              {/* Preset Name */}
              <div className="form-group">
                <label htmlFor="preset-name">Preset Name:</label>
                <input
                  id="preset-name"
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
                  <label htmlFor="global-password">Password (required for global):</label>
                  <input
                    id="global-password"
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

export default RhythmExplorer;
