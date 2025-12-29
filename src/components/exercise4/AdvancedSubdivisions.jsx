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
  TEMPO_MARKINGS
} from '../../constants/exercise4Defaults';

const AdvancedSubdivisions = forwardRef(({ sharedBpm, setSharedBpm, sharedIsPlaying, setSharedIsPlaying }, ref) => {
  const [beats, setBeats] = useState([]);
  const bpm = sharedBpm;
  const setBpm = setSharedBpm;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentCell, setCurrentCell] = useState(-1);
  const [tapTimes, setTapTimes] = useState([]);

  // Initialize beats
  useEffect(() => {
    initializeBeats();
  }, []);

  const initializeBeats = () => {
    setBeats(DEFAULT_ADVANCED.beats.map(beat => ({
      length: beat.length,
      division: beat.division,
      cells: new Array(beat.division).fill(CELL_STATES.NORMAL)
    })));
  };

  // Add new beat
  const addBeat = () => {
    setBeats(prev => [
      ...prev,
      {
        length: 1,
        division: 1,
        cells: [CELL_STATES.NORMAL]
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
        // Keep existing cell state if available
        newCells.push(oldCells[i] || CELL_STATES.NORMAL);
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
          RhythmAudioPlayer.playCell(cellState, scheduleTime, cellIndex === 0);
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
  }, [beats, bpm]);

  // Live updates during playback
  useEffect(() => {
    if (isPlaying) {
      RhythmAudioPlayer.stop();
      Tone.Transport.cancel();
      playPattern();
    }
  }, [beats, bpm]);

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

    </div>
  );
});

export default AdvancedSubdivisions;
