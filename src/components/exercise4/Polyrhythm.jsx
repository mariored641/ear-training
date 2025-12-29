import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import * as Tone from 'tone';
import RhythmAudioPlayer from '../../utils/RhythmAudioPlayer';
import {
  DEFAULT_POLYRHYTHM,
  CELL_STATES,
  POLYRHYTHM_PRESETS,
  BPM_MIN,
  BPM_MAX,
  TEMPO_MARKINGS
} from '../../constants/exercise4Defaults';

const Polyrhythm = forwardRef(({ sharedBpm, setSharedBpm, sharedIsPlaying, setSharedIsPlaying, sharedSoundSet }, ref) => {
  const [topCount, setTopCount] = useState(DEFAULT_POLYRHYTHM.top.count);
  const [bottomCount, setBottomCount] = useState(DEFAULT_POLYRHYTHM.bottom.count);
  const [topCells, setTopCells] = useState([]);
  const [bottomCells, setBottomCells] = useState([]);
  const bpm = sharedBpm;
  const setBpm = setSharedBpm;
  const isPlaying = sharedIsPlaying;
  const setIsPlaying = setSharedIsPlaying;
  const [currentTopCell, setCurrentTopCell] = useState(-1);
  const [currentBottomCell, setCurrentBottomCell] = useState(-1);
  const [tapTimes, setTapTimes] = useState([]);

  // Initialize cells
  useEffect(() => {
    initializeRow('top', topCount);
  }, [topCount]);

  useEffect(() => {
    initializeRow('bottom', bottomCount);
  }, [bottomCount]);

  const initializeRow = (row, count) => {
    const setCells = row === 'top' ? setTopCells : setBottomCells;
    setCells(prevCells => {
      const newCells = [];
      for (let i = 0; i < count; i++) {
        // Keep existing cell state if it exists
        if (prevCells[i] !== undefined) {
          newCells.push(prevCells[i]);
        } else {
          // New cell - initialize to NORMAL
          newCells.push(CELL_STATES.NORMAL);
        }
      }
      return newCells;
    });
  };

  // Toggle cell state
  const toggleCell = (row, cellIndex) => {
    const setCells = row === 'top' ? setTopCells : setBottomCells;
    setCells(prevCells => {
      const newCells = [...prevCells];
      const currentState = newCells[cellIndex];

      // Cycle through states
      const stateOrder = [CELL_STATES.ACCENT, CELL_STATES.NORMAL, CELL_STATES.SOFT, CELL_STATES.MUTE];
      const currentIndex = stateOrder.indexOf(currentState);
      const nextIndex = (currentIndex + 1) % stateOrder.length;
      newCells[cellIndex] = stateOrder[nextIndex];

      return newCells;
    });
  };

  // Set all cells in a row to a specific level
  const setRowLevel = (row) => {
    const setCells = row === 'top' ? setTopCells : setBottomCells;
    const cells = row === 'top' ? topCells : bottomCells;
    const count = row === 'top' ? topCount : bottomCount;

    // Get the current state of the first cell to determine next state
    const currentState = cells[0] || CELL_STATES.NORMAL;
    const stateOrder = [CELL_STATES.ACCENT, CELL_STATES.NORMAL, CELL_STATES.SOFT, CELL_STATES.MUTE];
    const currentIndex = stateOrder.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % stateOrder.length;
    const nextState = stateOrder[nextIndex];

    // Set all cells in the row to the next state
    setCells(new Array(count).fill(nextState));
  };

  // Apply preset
  const applyPreset = (preset) => {
    setTopCount(preset.top);
    setBottomCount(preset.bottom);
    // Reset cells to NORMAL
    setTimeout(() => {
      setTopCells(new Array(preset.top).fill(CELL_STATES.NORMAL));
      setBottomCells(new Array(preset.bottom).fill(CELL_STATES.NORMAL));
    }, 50);
  };

  // Play/Stop
  const handlePlayStop = async () => {
    if (isPlaying) {
      RhythmAudioPlayer.stop();
      setIsPlaying(false);
      setCurrentTopCell(-1);
      setCurrentBottomCell(-1);
    } else {
      await RhythmAudioPlayer.init();
      playPolyrhythm();
      setIsPlaying(true);
    }
  };

  const playPolyrhythm = useCallback(() => {
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;

    const cycleDuration = 60 / bpm; // One full cycle in seconds
    const topCellDuration = cycleDuration / topCount;
    const bottomCellDuration = cycleDuration / bottomCount;

    // Schedule Top row
    let time = 0;
    topCells.forEach((cellState, index) => {
      Tone.Transport.schedule((scheduleTime) => {
        RhythmAudioPlayer.playCell(cellState, scheduleTime, index === 0, sharedSoundSet);
        setCurrentTopCell(index);

        setTimeout(() => {
          setCurrentTopCell(-1);
        }, topCellDuration * 1000 * 0.5);
      }, time);
      time += topCellDuration;
    });

    // Schedule Bottom row
    time = 0;
    bottomCells.forEach((cellState, index) => {
      Tone.Transport.schedule((scheduleTime) => {
        RhythmAudioPlayer.playCell(cellState, scheduleTime, index === 0, sharedSoundSet);
        setCurrentBottomCell(index);

        setTimeout(() => {
          setCurrentBottomCell(-1);
        }, bottomCellDuration * 1000 * 0.5);
      }, time);
      time += bottomCellDuration;
    });

    // Set up looping
    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = cycleDuration;
    Tone.Transport.start();
  }, [topCells, bottomCells, bpm, topCount, bottomCount, sharedSoundSet]);

  // Live updates during playback
  useEffect(() => {
    if (isPlaying) {
      RhythmAudioPlayer.stop();
      Tone.Transport.cancel();
      playPolyrhythm();
    }
  }, [topCells, bottomCells, bpm, sharedSoundSet]);

  // Clear
  const handleClear = () => {
    setTopCells(new Array(topCount).fill(CELL_STATES.NORMAL));
    setBottomCells(new Array(bottomCount).fill(CELL_STATES.NORMAL));
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

  // Calculate cell width as percentage
  const getTopCellWidth = () => `${100 / topCount}%`;
  const getBottomCellWidth = () => `${100 / bottomCount}%`;

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    handlePlayStop,
    handleClear
  }));

  return (
    <div className="polyrhythm">
      {/* Mobile Headers - Only visible on mobile */}
      <div className="polyrhythm-headers-mobile">
        {/* Top Header */}
        <div className="header-row">
          <div className="row-label-mobile">
            Top:
            <button
              className={`row-level-btn poly-cell-${topCells[0] || CELL_STATES.NORMAL}`}
              onClick={() => setRowLevel('top')}
              title="Click to change all cells in this row to the same level"
              style={{ marginLeft: '8px' }}
            />
          </div>
          <div className="row-controls-mobile">
            <button
              className="control-btn"
              onClick={() => setTopCount(Math.max(1, topCount - 1))}
            >
              -
            </button>
            <span className="count-display">{topCount}</span>
            <button
              className="control-btn"
              onClick={() => setTopCount(Math.min(16, topCount + 1))}
            >
              +
            </button>
          </div>
        </div>

        {/* Bottom Header */}
        <div className="header-row">
          <div className="row-label-mobile">
            Bottom:
            <button
              className={`row-level-btn poly-cell-${bottomCells[0] || CELL_STATES.NORMAL}`}
              onClick={() => setRowLevel('bottom')}
              title="Click to change all cells in this row to the same level"
              style={{ marginLeft: '8px' }}
            />
          </div>
          <div className="row-controls-mobile">
            <button
              className="control-btn"
              onClick={() => setBottomCount(Math.max(1, bottomCount - 1))}
            >
              -
            </button>
            <span className="count-display">{bottomCount}</span>
            <button
              className="control-btn"
              onClick={() => setBottomCount(Math.min(16, bottomCount + 1))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Polyrhythm Grid */}
      <div className="polyrhythm-grid">
        {/* Top Row */}
        <div className="polyrhythm-row">
          <div className="row-label-container">
            <div className="row-label">Top:</div>
            <button
              className={`row-level-btn poly-cell-${topCells[0] || CELL_STATES.NORMAL}`}
              onClick={() => setRowLevel('top')}
              title="Click to change all cells in this row to the same level"
            />
          </div>
          <div className="row-cells-container">
            <div className="row-cells">
              {topCells.map((cellState, index) => (
                <div
                  key={index}
                  className={`poly-cell poly-cell-${cellState} ${
                    currentTopCell === index ? 'playing' : ''
                  }`}
                  style={{ width: getTopCellWidth() }}
                  onClick={() => toggleCell('top', index)}
                />
              ))}
            </div>
          </div>
          <div className="row-controls">
            <button
              className="control-btn"
              onClick={() => setTopCount(Math.max(1, topCount - 1))}
            >
              -
            </button>
            <button
              className="control-btn"
              onClick={() => setTopCount(Math.min(16, topCount + 1))}
            >
              +
            </button>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="polyrhythm-row">
          <div className="row-label-container">
            <div className="row-label">Bottom:</div>
            <button
              className={`row-level-btn poly-cell-${bottomCells[0] || CELL_STATES.NORMAL}`}
              onClick={() => setRowLevel('bottom')}
              title="Click to change all cells in this row to the same level"
            />
          </div>
          <div className="row-cells-container">
            <div className="row-cells">
              {bottomCells.map((cellState, index) => (
                <div
                  key={index}
                  className={`poly-cell poly-cell-${cellState} ${
                    currentBottomCell === index ? 'playing' : ''
                  }`}
                  style={{ width: getBottomCellWidth() }}
                  onClick={() => toggleCell('bottom', index)}
                />
              ))}
            </div>
          </div>
          <div className="row-controls">
            <button
              className="control-btn"
              onClick={() => setBottomCount(Math.max(1, bottomCount - 1))}
            >
              -
            </button>
            <button
              className="control-btn"
              onClick={() => setBottomCount(Math.min(16, bottomCount + 1))}
            >
              +
            </button>
          </div>
        </div>

        {/* Ratio Display */}
        <div className="ratio-display">
          {topCount} : {bottomCount}
        </div>
      </div>

      {/* Polyrhythm Presets */}
      <div className="preset-section">
        <div className="control-label">Polyrhythm Presets</div>
        <div className="preset-buttons">
          {POLYRHYTHM_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="preset-btn"
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
});

export default Polyrhythm;
