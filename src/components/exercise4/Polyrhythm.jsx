import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_POLYRHYTHM, CELL_STATES, POLYRHYTHM_PRESETS } from '../../constants/exercise4Defaults';
import { createRow, resizeRow, polyrhythmPattern } from '../../utils/rhythm/patterns';
import useRhythmPlayback from './useRhythmPlayback';
import CellIcon from './CellIcon';

const stateOrder = [CELL_STATES.ACCENT, CELL_STATES.NORMAL, CELL_STATES.SOFT, CELL_STATES.MUTE];
const nextState = state => stateOrder[(stateOrder.indexOf(state) + 1) % stateOrder.length];

const Polyrhythm = forwardRef(({ sharedBpm, sharedIsPlaying, setSharedIsPlaying, sharedSoundSet }, ref) => {
  const { t } = useTranslation();
  const nextId = useRef(2);
  const [rows, setRows] = useState(() => [
    createRow(0, DEFAULT_POLYRHYTHM.top.count), createRow(1, DEFAULT_POLYRHYTHM.bottom.count),
  ]);
  const pattern = useMemo(() => polyrhythmPattern(rows), [rows]);
  const { currentCells, playbackError, handlePlayStop } = useRhythmPlayback(
    pattern, sharedBpm, sharedSoundSet, sharedIsPlaying, setSharedIsPlaying,
  );
  const updateRow = (id, update) => setRows(previous => previous.map(row => row.id === id ? update(row) : row));
  const handleClear = () => setRows(previous => previous.map(row => ({ ...row, cells: row.cells.map(() => CELL_STATES.NORMAL) })));
  const applyPreset = preset => {
    // Presets change the first two rows; additional custom rows are preserved.
    setRows(previous => {
      const result = [...previous];
      [preset.top, preset.bottom].forEach((count, index) => {
        result[index] = createRow(result[index]?.id ?? nextId.current++, count);
      });
      return result;
    });
  };
  useImperativeHandle(ref, () => ({ handlePlayStop, handleClear }));

  const setCount = (id, count) => updateRow(id, row => resizeRow(row, count));
  const cycleRow = id => updateRow(id, row => ({ ...row, cells: row.cells.map(() => nextState(row.cells[0])) }));
  const toggleCell = (id, cell) => updateRow(id, row => ({
    ...row, cells: row.cells.map((value, i) => i === cell ? nextState(value) : value),
  }));
  const removeRow = id => setRows(previous => previous.length > 1 ? previous.filter(row => row.id !== id) : previous);
  const levelButton = row => (
    <button className={`row-level-btn rc rc-${row.cells[0]}`} onClick={() => cycleRow(row.id)}
      title={t('rhythm.changeWholeRow')}>
      <CellIcon state={row.cells[0]} />
    </button>
  );
  const countButtons = row => (
    <>
      <button className="control-btn" onClick={() => setCount(row.id, row.cells.length - 1)}>-</button>
      <span className="count-display">{row.cells.length}</span>
      <button className="control-btn" onClick={() => setCount(row.id, row.cells.length + 1)}>+</button>
    </>
  );
  const removeButton = (row, index) => (
    <button className="control-btn" disabled={rows.length === 1} title={t('rhythm.removeRow', { number: index + 1 })}
      aria-label={t('rhythm.removeRow', { number: index + 1 })} onClick={() => removeRow(row.id)}>🗑️</button>
  );

  return (
    <div className="polyrhythm">
      {playbackError && <p role="alert">{t('rhythm.playbackError')}</p>}
      <button className="add-beat-btn" onClick={() => setRows(previous => [...previous, createRow(nextId.current++)])}>
        + {t('rhythm.addRow')}
      </button>

      {/* Mobile Headers - Only visible on mobile */}
      <div className="polyrhythm-headers-mobile">
        {rows.map((row, index) => (
          <div className="header-row" key={row.id}>
            <div className="row-label-mobile">
              {t('rhythm.row', { number: index + 1 })}:
              <span style={{ marginLeft: '8px' }}>{levelButton(row)}</span>
            </div>
            <div className="row-controls-mobile">
              {countButtons(row)}
              {removeButton(row, index)}
            </div>
          </div>
        ))}
      </div>

      <div className="polyrhythm-grid">
        {rows.map((row, index) => (
          <div className="polyrhythm-row" key={row.id}>
            <div className="row-label-container">
              <div className="row-label">{t('rhythm.row', { number: index + 1 })}:</div>
              {levelButton(row)}
            </div>
            <div className="row-cells-container">
              <div className="row-cells">
                {row.cells.map((state, cell) => (
                  <div key={cell} className={`poly-cell rc rc-${state} ${currentCells[row.id] === cell ? 'playing' : ''}`}
                    style={{ width: `${100 / row.cells.length}%` }}
                    onClick={() => toggleCell(row.id, cell)}>
                    <CellIcon state={state} />
                  </div>
                ))}
              </div>
            </div>
            <div className="row-controls">
              {countButtons(row)}
              {removeButton(row, index)}
            </div>
          </div>
        ))}
        <div className="ratio-display" dir="ltr">{rows.map(row => row.cells.length).join(' : ')}</div>
      </div>

      <div className="preset-section">
        <div className="control-label">{t('rhythm.polyrhythmPresets')}</div>
        <div className="preset-buttons">
          {POLYRHYTHM_PRESETS.map(preset => (
            <button key={preset.label} className="preset-btn" onClick={() => applyPreset(preset)}>{preset.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default Polyrhythm;
