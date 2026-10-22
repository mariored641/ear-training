import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clampTempo } from '../../utils/rhythm/patterns';
import {
  BPM_MIN,
  BPM_MAX,
  TEMPO_MARKINGS
} from '../../constants/exercise4Defaults';

const StickyControls = ({
  bpm,
  setBpm,
  isPlaying,
  onPlayStop,
  onClear,
  onTap,
  soundSet,
  setSoundSet
}) => {
  const { t } = useTranslation();
  const [isStuck, setIsStuck] = useState(false);
  const [showBPMModal, setShowBPMModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sticky detection using scroll
  useEffect(() => {
    const handleScroll = () => {
      const controls = document.querySelector('.sticky-controls');
      if (!controls) return;

      const rect = controls.getBoundingClientRect();
      const originalTop = controls.offsetTop;

      // If scrolled past the original position, make it fixed
      setIsStuck(window.scrollY > originalTop);
    };

    handleScroll(); // Initial check
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get tempo marking
  const getTempoMarking = () => {
    for (const marking of TEMPO_MARKINGS) {
      if (bpm >= marking.min && bpm <= marking.max) {
        return marking.name;
      }
    }
    return 'Andante';
  };

  const handleBPMChange = (newBpm) => {
    const value = clampTempo(newBpm);
    setBpm(value);
  };

  const handleSoundSetChange = (newSoundSet) => {
    setSoundSet(newSoundSet);
  };

  return (
    <>
      <div className={`sticky-controls ${isStuck ? 'is-stuck' : ''}`}>
        {/* Playback Buttons */}
        <div className="playback-buttons">
          <button className="action-btn secondary tap-btn" onClick={onTap}>
            👆<span> {t('tools.tap')}</span>
          </button>
          <button className="action-btn primary play-btn" onClick={onPlayStop}>
            {isPlaying ? '⏸️' : '▶️'}<span> {isPlaying ? t('rhythm.pause') : t('common.play')}</span>
          </button>
          <button className="action-btn secondary clear-btn" onClick={onClear}>
            🔄<span> {t('common.clear')}</span>
          </button>
        </div>

        {/* Sound Switcher */}
        <div className="sound-switcher">
          <button
            className={`sound-btn ${soundSet === 'classicClick' ? 'active' : ''}`}
            onClick={() => handleSoundSetChange('classicClick')}
            title={t('rhythm.classicClick')}
          >
            🔘
          </button>
          <button
            className={`sound-btn ${soundSet === 'drumKit' ? 'active' : ''}`}
            onClick={() => handleSoundSetChange('drumKit')}
            title={t('rhythm.drumKit')}
          >
            🥁
          </button>
        </div>

        {/* BPM Control */}
        {isMobile ? (
          // Mobile - Collapsed BPM
          <button
            className="bpm-collapsed"
            onClick={() => setShowBPMModal(true)}
          >
            <span className="bpm-value">{bpm}</span>
            <span className="bpm-arrow">▼</span>
          </button>
        ) : (
          // Desktop - Full BPM Control
          <div className="bpm-control-sticky">
            <div className="bpm-label-small">BPM</div>
            <div className="bpm-input-group">
              <button
                className="bpm-btn-small"
                onClick={() => handleBPMChange(bpm - 1)}
              >
                -
              </button>
              <input
                type="number"
                className="bpm-input-small"
                value={bpm}
                onChange={(e) => handleBPMChange(e.target.value)}
                min={BPM_MIN}
                max={BPM_MAX}
              />
              <button
                className="bpm-btn-small"
                onClick={() => handleBPMChange(bpm + 1)}
              >
                +
              </button>
            </div>
            <input
              type="range"
              className="bpm-slider-small"
              min={BPM_MIN}
              max={BPM_MAX}
              value={bpm}
              onChange={(e) => handleBPMChange(e.target.value)}
            />
            <div className="bpm-tempo-name-small">{getTempoMarking()}</div>
          </div>
        )}
      </div>

      {/* Mobile BPM Modal */}
      {isMobile && showBPMModal && (
        <div className="bpm-modal active" onClick={() => setShowBPMModal(false)}>
          <div className="bpm-modal-overlay"></div>
          <div className="bpm-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>BPM: <span id="modalBpmValue">{bpm}</span></h3>

            <div className="bpm-controls-modal">
              <button
                className="bpm-btn-modal"
                onClick={() => handleBPMChange(bpm - 1)}
              >
                -
              </button>
              <input
                type="range"
                className="bpm-slider-modal"
                min={BPM_MIN}
                max={BPM_MAX}
                value={bpm}
                onChange={(e) => handleBPMChange(e.target.value)}
              />
              <button
                className="bpm-btn-modal"
                onClick={() => handleBPMChange(bpm + 1)}
              >
                +
              </button>
            </div>

            <div className="bpm-tempo-name-modal">{getTempoMarking()}</div>

            <button
              className="modal-done-btn"
              onClick={() => setShowBPMModal(false)}
            >
              ✓ {t('common.done')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default StickyControls;
