import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PartialChordCard from './PartialChordCard';
import QualityPickerModal from './QualityPickerModal';
import {
  CAGED_ORDER,
  STRING_SETS,
  STRING_SETS_BY_WIDTH,
  DEFAULT_SET_IDX_BY_WIDTH,
  CHORD_QUALITIES,
  isBasicTriad,
  formatChordName,
  findBestShapeForFret,
} from '../../utils/partialChordShapes';
import './PartialChordsTab.css';
import { formatNoteName } from '../../i18n/musicTerms';
import { readLastState, useRemember, usePersistentState } from '../../utils/lastState';
import { deleteLocalPreset, getLocalPresets, savePreset } from '../../utils/presetManager';

const PARTIAL_PRESET_TYPE = 'partial_chords';

const ROOT_OPTIONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WIDTH_OPTIONS = [3, 4, 5, 6];

const DISPLAY_MODES = [
  { id: 'dots',  key: 'positions.dots' },
  { id: 'tones', key: 'positions.numbers' },
  { id: 'notes', key: 'positions.notes' },
];

function chordLabel(chord) {
  return formatChordName(chord.root, chord.quality);
}

function wrap(n, len) {
  return ((n % len) + len) % len;
}

// Pick a set in the desired width whose lowest-string index matches the
// current set as closely as possible. Keeps voicing visually anchored.
function setIdxForWidth(currentSetIdx, newWidth) {
  const list = STRING_SETS_BY_WIDTH[newWidth] || [];
  if (list.length === 0) return DEFAULT_SET_IDX_BY_WIDTH[newWidth] ?? 3;
  const current = STRING_SETS[currentSetIdx];
  if (!current) return list[0];
  const curLow = current.shapeIndices[0];
  let best = list[0];
  let bestDist = Infinity;
  list.forEach((idx) => {
    const dist = Math.abs(STRING_SETS[idx].shapeIndices[0] - curLow);
    if (dist < bestDist) {
      bestDist = dist;
      best = idx;
    }
  });
  return best;
}

function PartialChordsTab({ progression, onProgressionChange, activeIdx, onActiveIdxChange }) {
  const { t, i18n } = useTranslation();
  const remembered = readLastState('positions-partial-builder', 1, {
    builderRoot: 'A', builderQuality: 'minor', displayMode: 'tones', targetFret: 5, width: 3,
  });
  const [builderRoot, setBuilderRoot] = useState(remembered.builderRoot || 'A');
  const [builderQuality, setBuilderQuality] = useState(remembered.builderQuality || 'minor');
  const [displayMode, setDisplayMode] = useState(remembered.displayMode || 'tones');
  const [targetFret, setTargetFret] = useState(Number(remembered.targetFret) || 5);
  const [width, setWidth] = useState(Number(remembered.width) || 3);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [presets, setPresets] = useState(() => getLocalPresets(PARTIAL_PRESET_TYPE));
  const [pickedId, setPickedId] = useState('');
  const [naming, setNaming] = useState(false);
  const [presetName, setPresetName] = usePersistentState('partial-preset-draft', 'presetName', '');
  useRemember('positions-partial-builder', 1, { builderRoot, builderQuality, displayMode, targetFret, width });

  const refreshPresets = () => setPresets(getLocalPresets(PARTIAL_PRESET_TYPE));

  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name) return;
    const result = await savePreset(PARTIAL_PRESET_TYPE, {
      name, progression, activeIdx, builderRoot, builderQuality, displayMode, targetFret, width,
    });
    if (result.success) {
      refreshPresets();
      setPickedId(result.preset.id);
      setPresetName('');
      setNaming(false);
    }
  };

  const handlePickPreset = (id) => {
    setPickedId(id);
    const preset = presets.find(item => item.id === id);
    if (!preset) return;
    onProgressionChange(Array.isArray(preset.progression) ? preset.progression : []);
    onActiveIdxChange(Number.isInteger(preset.activeIdx) ? preset.activeIdx : 0);
    if (preset.builderRoot) setBuilderRoot(preset.builderRoot);
    if (preset.builderQuality) setBuilderQuality(preset.builderQuality);
    if (preset.displayMode) setDisplayMode(preset.displayMode);
    if (preset.targetFret) setTargetFret(preset.targetFret);
    if (preset.width) setWidth(preset.width);
  };

  const handleDeletePreset = () => {
    const preset = presets.find(item => item.id === pickedId);
    if (!preset) return;
    if (!window.confirm(t('backing.deleteProgression', { name: preset.name }))) return;
    deleteLocalPreset(PARTIAL_PRESET_TYPE, preset.id);
    setPickedId('');
    refreshPresets();
  };

  const handleAdd = useCallback(() => {
    const { cagedIdx, setIdx } = findBestShapeForFret(builderRoot, builderQuality, targetFret, width);
    const next = [...progression, { root: builderRoot, quality: builderQuality, cagedIdx, setIdx }];
    onProgressionChange(next);
    onActiveIdxChange(next.length - 1);
  }, [builderRoot, builderQuality, targetFret, width, progression, onProgressionChange, onActiveIdxChange]);

  const handleFretChange = useCallback((fret) => {
    setTargetFret(fret);
    if (progression.length > 0) {
      const next = progression.map((chord) => ({
        ...chord,
        ...findBestShapeForFret(chord.root, chord.quality, fret, width),
      }));
      onProgressionChange(next);
    }
  }, [progression, onProgressionChange, width]);

  const handleWidthChange = useCallback((newWidth) => {
    setWidth(newWidth);
    if (progression.length > 0) {
      const next = progression.map((chord) => ({
        ...chord,
        setIdx: setIdxForWidth(chord.setIdx, newWidth),
      }));
      onProgressionChange(next);
    }
  }, [progression, onProgressionChange]);

  const handleClear = useCallback(() => {
    onProgressionChange([]);
    onActiveIdxChange(0);
  }, [onProgressionChange, onActiveIdxChange]);

  const handleRemove = useCallback((idx) => {
    const next = progression.filter((_, i) => i !== idx);
    onProgressionChange(next);
    if (activeIdx >= next.length) {
      onActiveIdxChange(Math.max(0, next.length - 1));
    }
  }, [progression, activeIdx, onProgressionChange, onActiveIdxChange]);

  const updateChord = useCallback((idx, patch) => {
    const next = progression.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onProgressionChange(next);
  }, [progression, onProgressionChange]);

  const handleNavCaged = useCallback((idx, dir) => {
    const chord = progression[idx];
    updateChord(idx, { cagedIdx: wrap(chord.cagedIdx + dir, CAGED_ORDER.length) });
  }, [progression, updateChord]);

  const handleNavSet = useCallback((idx, dir) => {
    const chord = progression[idx];
    const list = STRING_SETS_BY_WIDTH[width] || [];
    if (list.length === 0) return;
    const currentPos = list.indexOf(chord.setIdx);
    const startPos = currentPos < 0 ? 0 : currentPos;
    const nextPos = wrap(startPos + dir, list.length);
    updateChord(idx, { setIdx: list[nextPos] });
  }, [progression, width, updateChord]);

  const moreBtnLabel = isBasicTriad(builderQuality)
    ? t('positions.more')
    : (CHORD_QUALITIES[builderQuality]?.label || t('positions.more'));

  return (
    <div className="pct-root">
      <div className="pct-builder">
        <div className="pct-group">
          <label className="pct-label">{t('common.root')}</label>
          <select
            className="pct-select"
            value={builderRoot}
            onChange={(e) => setBuilderRoot(e.target.value)}
          >
            {ROOT_OPTIONS.map((r) => (
              <option key={r} value={r}>{formatNoteName(r, i18n.language)}</option>
            ))}
          </select>
        </div>

        <div className="pct-group">
          <label className="pct-label">{t('positions.quality')}</label>
          <div className="pct-quality-toggle">
            <button
              className={`pct-quality-btn ${builderQuality === 'major' ? 'active' : ''}`}
              onClick={() => setBuilderQuality('major')}
            >
              Maj
            </button>
            <button
              className={`pct-quality-btn ${builderQuality === 'minor' ? 'active' : ''}`}
              onClick={() => setBuilderQuality('minor')}
            >
              Min
            </button>
            <button
              className={`pct-quality-btn pct-more-btn ${!isBasicTriad(builderQuality) ? 'active' : ''}`}
              onClick={() => setIsQualityModalOpen(true)}
              title={t('positions.chooseQuality')}
            >
              {moreBtnLabel}
            </button>
          </div>
        </div>

        <div className="pct-presets">
          <select
            className="pct-select pct-preset-select"
            aria-label={t('rhythm.loadPreset')}
            value={pickedId}
            onChange={(event) => handlePickPreset(event.target.value)}
          >
            <option value="">{t('rhythm.loadPreset')}</option>
            {presets.map(preset => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
          {naming ? (
            <>
              <input
                className="pct-preset-name"
                value={presetName}
                placeholder={t('rhythm.enterPresetName')}
                aria-label={t('rhythm.presetName')}
                onChange={(event) => setPresetName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') handleSavePreset(); }}
              />
              <button type="button" className="pct-add-btn" onClick={handleSavePreset} disabled={!presetName.trim()}>
                {t('common.save')}
              </button>
              <button type="button" className="pct-clear-btn" onClick={() => { setNaming(false); setPresetName(''); }}>
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <button type="button" className="pct-add-btn" onClick={() => setNaming(true)}>
              {t('rhythm.savePreset')}
            </button>
          )}
          <button type="button" className="pct-clear-btn" onClick={handleDeletePreset} disabled={!pickedId}>
            {t('common.delete')}
          </button>
        </div>
        <button className="pct-add-btn" onClick={handleAdd}>+ {t('common.add')}</button>
        <button className="pct-clear-btn" onClick={handleClear} disabled={progression.length === 0}>
          {t('common.clear')}
        </button>

        <div className="pct-group pct-fret-group">
          <label className="pct-label">{t('positions.positionFret', { fret: targetFret })}</label>
          <input
            type="range"
            className="pct-fret-slider"
            min="1" max="12"
            value={targetFret}
            onChange={(e) => handleFretChange(Number(e.target.value))}
          />
        </div>

        <div className="pct-group">
          <label className="pct-label">{t('positions.strings')}</label>
          <div className="pct-width-toggle">
            {WIDTH_OPTIONS.map((w) => (
              <button
                key={w}
                className={`pct-width-btn ${width === w ? 'active' : ''}`}
                onClick={() => handleWidthChange(w)}
                title={t('positions.stringCount', { count: w })}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="pct-group pct-display-group">
          <label className="pct-label">{t('positions.show')}</label>
          <div className="pct-display-toggle">
            {DISPLAY_MODES.map((m) => (
              <button
                key={m.id}
                className={`pct-display-btn ${displayMode === m.id ? 'active' : ''}`}
                onClick={() => setDisplayMode(m.id)}
              >
                {t(m.key)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {progression.length > 0 && (
        <div className="pct-pills">
          {progression.map((chord, idx) => (
            <button
              key={idx}
              className={`pct-pill ${idx === activeIdx ? 'active' : ''}`}
              onClick={() => onActiveIdxChange(idx)}
            >
              {chordLabel(chord)}
            </button>
          ))}
        </div>
      )}

      {progression.length === 0 ? (
        <div className="pct-empty">
          {t('positions.partialEmpty')}
        </div>
      ) : (
        <div className="pct-cards">
          {progression.map((chord, idx) => (
            <PartialChordCard
              key={idx}
              chord={chord}
              isActive={idx === activeIdx}
              onSelect={() => onActiveIdxChange(idx)}
              onNavCaged={(dir) => handleNavCaged(idx, dir)}
              onNavSet={(dir) => handleNavSet(idx, dir)}
              onRemove={() => handleRemove(idx)}
              displayMode={displayMode}
            />
          ))}
        </div>
      )}

      {isQualityModalOpen && (
        <QualityPickerModal
          value={builderQuality}
          onSelect={(q) => setBuilderQuality(q)}
          onClose={() => setIsQualityModalOpen(false)}
        />
      )}
    </div>
  );
}

export default PartialChordsTab;
