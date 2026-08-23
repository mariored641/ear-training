import React from 'react';
import { useTranslation } from 'react-i18next';
import { CHROMATIC_SCALE } from '../../constants/positionData';
import './ControlPanel.css';
import { formatNoteName } from '../../i18n/musicTerms';

const POSITION_NAMES = ['C', 'A', 'G', 'E', 'D'];

const NOTE_DISPLAY_LABELS = {
  'A': 'A', 'A#': 'Bb', 'B': 'B', 'C': 'C', 'C#': 'Db',
  'D': 'D', 'D#': 'Eb', 'E': 'E', 'F': 'F', 'F#': 'F#',
  'G': 'G', 'G#': 'Ab',
};

const ControlPanel = ({
  selectedRoot,
  onRootChange,
  selectedType,
  onTypeChange,
  selectedPositions,
  onPositionsChange,
  showAll,
  onShowAllChange,
  onQuickRefClick,
}) => {
  const { t, i18n } = useTranslation();
  const handlePositionToggle = (posName) => {
    if (selectedPositions.includes(posName)) {
      onPositionsChange(selectedPositions.filter(p => p !== posName));
    } else {
      onPositionsChange([...selectedPositions, posName]);
    }
  };

  return (
    <div className="control-panel">
      {/* Row 1: Root + Scale Type + Quick Ref */}
      <div className="control-row">
        <div className="control-group">
          <label className="control-label">{t('common.root')}:</label>
          <select
            className="root-select"
            value={selectedRoot}
            onChange={(e) => onRootChange(e.target.value)}
          >
            {CHROMATIC_SCALE.map(note => (
              <option key={note} value={note}>{formatNoteName(NOTE_DISPLAY_LABELS[note], i18n.language)}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label className="control-label">{t('common.type')}:</label>
          <div className="scale-type-buttons">
            <button
              className={`type-btn ${selectedType === 'major' ? 'active' : ''}`}
              onClick={() => onTypeChange('major')}
            >
              {t('common.major')}
            </button>
            <button
              className={`type-btn ${selectedType === 'minor' ? 'active' : ''}`}
              onClick={() => onTypeChange('minor')}
            >
              {t('common.minor')}
            </button>
          </div>
        </div>

        <button className="quick-ref-btn" onClick={onQuickRefClick} title={t('positions.quickReference')}>
          <span role="img" aria-label={t('positions.quickReference')}>&#128203;</span>
        </button>
      </div>

      {/* Row 2: Position buttons */}
      <div className="control-row">
        <label className="control-label">{t('positions.positions')}:</label>
        <div className="position-buttons">
          {POSITION_NAMES.map(name => (
            <button
              key={name}
              className={`position-btn ${selectedPositions.includes(name) ? 'active' : ''}`}
              onClick={() => handlePositionToggle(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: Show All */}
      <div className="control-row">
        <label className="show-all-toggle">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => onShowAllChange(e.target.checked)}
          />
          <span className="toggle-label">{t('positions.showAll')}</span>
        </label>
      </div>
    </div>
  );
};

export default React.memo(ControlPanel);
