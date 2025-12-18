import React, { useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import RhythmAudioPlayer from '../../utils/RhythmAudioPlayer';
import {
  DEFAULT_RHYTHM_EXPLORER,
  CELL_STATES,
  SUBDIVISIONS,
  TIME_SIGNATURES,
  BPM_MIN,
  BPM_MAX,
  TEMPO_MARKINGS
} from '../../constants/exercise4Defaults';

const RhythmExplorer = () => {
  const [beats, setBeats] = useState(DEFAULT_RHYTHM_EXPLORER.beats);
  const [subdivision, setSubdivision] = useState(DEFAULT_RHYTHM_EXPLORER.subdivision);
  const [bpm, setBpm] = useState(DEFAULT_RHYTHM_EXPLORER.bpm);
  const [timeSignature, setTimeSignature] = useState(DEFAULT_RHYTHM_EXPLORER.timeSignature);
  const [grid, setGrid] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCell, setCurrentCell] = useState({ beat: -1, cell: -1 });
  const [showSubdivisionModal, setShowSubdivisionModal] = useState(false);
  const [tapTimes, setTapTimes] = useState([]);

  // Initialize grid
  useEffect(() => {
    initializeGrid();
  }, [beats, subdivision]);

  const initializeGrid = () => {
    const newGrid = [];
    for (let i = 0; i < beats; i++) {
      const row = [];
      for (let j = 0; j < subdivision; j++) {
        row.push(CELL_STATES.NORMAL);
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
  };

  // Toggle cell state
  const toggleCell = (beatIndex, cellIndex) => {
    setGrid(prevGrid => {
      const newGrid = [...prevGrid];
      const currentState = newGrid[beatIndex][cellIndex];

      // Cycle through states: accent (dark) -> normal (medium) -> soft (light) -> mute (white) -> accent
      const stateOrder = [CELL_STATES.ACCENT, CELL_STATES.NORMAL, CELL_STATES.SOFT, CELL_STATES.MUTE];
      const currentIndex = stateOrder.indexOf(currentState);
      const nextIndex = (currentIndex + 1) % stateOrder.length;
      const nextState = stateOrder[nextIndex];

      console.log(`Cell [${beatIndex}][${cellIndex}]: ${currentState} -> ${nextState}`);

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

  const playPattern = () => {
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;

    const beatDuration = 60 / bpm; // seconds per beat
    const cellDuration = beatDuration / subdivision;

    let time = 0;

    grid.forEach((beat, beatIndex) => {
      beat.forEach((cellState, cellIndex) => {
        Tone.Transport.schedule((scheduleTime) => {
          // First cell of each beat gets emphasis
          const isBeatStart = cellIndex === 0;
          RhythmAudioPlayer.playCell(cellState, scheduleTime, isBeatStart);

          // Visual feedback
          setCurrentCell({ beat: beatIndex, cell: cellIndex });
          setTimeout(() => {
            setCurrentCell({ beat: -1, cell: -1 });
          }, cellDuration * 1000 * 0.5);
        }, time);

        time += cellDuration;
      });
    });

    // Loop
    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = time;
    Tone.Transport.start();
  };

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

  // Time signature change with accent patterns
  const handleTimeSignatureChange = (sig) => {
    setTimeSignature(sig);
    const numerator = parseInt(sig.split('/')[0]);
    setBeats(numerator);

    // Initialize all cells to NORMAL - user can click to change
    setTimeout(() => {
      setGrid(prevGrid => {
        const newGrid = [];
        for (let i = 0; i < numerator; i++) {
          const row = [];
          for (let j = 0; j < subdivision; j++) {
            row.push(CELL_STATES.NORMAL);
          }
          newGrid.push(row);
        }
        return newGrid;
      });
    }, 50);
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
                    className={`beat-cell ${cellState} ${
                      currentCell.beat === beatIndex && currentCell.cell === cellIndex ? 'playing' : ''
                    }`}
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
        {/* Beats Control */}
        <div className="control-section">
        <div className="control-group">
          <div className="beats-control">
            <div className="beats-display">Beats: {beats}</div>
            <button
              className="control-btn subdivision-trigger"
              onClick={() => setShowSubdivisionModal(true)}
            >
              {getSubdivisionIcon()}
            </button>
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

        {/* BPM Control */}
        <div className="control-group">
          <div className="control-label">BPM</div>
          <div className="bpm-control">
            <div className="bpm-display">
              <button
                className="control-btn"
                onClick={() => setBpm(Math.max(BPM_MIN, bpm - 1))}
              >
                -
              </button>
              <div className="bpm-value">{bpm}</div>
              <button
                className="control-btn"
                onClick={() => setBpm(Math.min(BPM_MAX, bpm + 1))}
              >
                +
              </button>
            </div>
            <input
              type="range"
              min={BPM_MIN}
              max={BPM_MAX}
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="bpm-slider"
            />
            <div className="tempo-marking">{getTempoMarking()}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="action-btn secondary" onClick={handleTap}>
          👆 Tap
        </button>
        <button className="action-btn primary" onClick={handlePlayStop}>
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button className="action-btn secondary" onClick={handleClear}>
          🔄 Clear
        </button>
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
    </div>
  );
};

export default RhythmExplorer;
