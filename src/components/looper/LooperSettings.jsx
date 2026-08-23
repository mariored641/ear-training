import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LooperSettings({ session, onClose, actions }) {
  const { t } = useTranslation();
  const timingLocked = session.tracks.length > 0;
  const signature = session.timeSignature.join('/');

  const reset = async () => {
    if (!window.confirm(t('looper.newSessionConfirm'))) return;
    await actions.resetSession();
    onClose();
  };

  return (
    <div className="looper-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="looper-modal" role="dialog" aria-modal="true" aria-labelledby="looper-settings-title">
        <header>
          <div>
            <h2 id="looper-settings-title">{t('looper.settingsTitle')}</h2>
            <p>{t('looper.settingsHelp')}</p>
          </div>
          <button type="button" className="looper-modal-close" onClick={onClose} aria-label={t('common.close')}>×</button>
        </header>

        <div className="looper-settings-grid">
          <label>
            <span>{t('looper.timeSignature')}</span>
            <select
              className="ws-control"
              value={signature}
              disabled={timingLocked}
              onChange={(event) => {
                const [numerator, denominator] = event.target.value.split('/').map(Number);
                actions.setTimeSignature(numerator, denominator);
              }}
            >
              <option value="4/4">4/4</option>
              <option value="3/4">3/4</option>
              <option value="6/8">6/8</option>
            </select>
          </label>

          <label>
            <span>{t('looper.countIn')}</span>
            <select
              className="ws-control"
              value={session.countInBars}
              onChange={(event) => actions.setCountInBars(event.target.value)}
            >
              <option value="0">{t('looper.noCountIn')}</option>
              <option value="1">{t('looper.oneBar')}</option>
              <option value="2">{t('looper.twoBars')}</option>
            </select>
          </label>

          <label className="looper-click-volume">
            <span>{t('looper.clickVolume')}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={session.clickVolume}
              onChange={(event) => actions.setClickVolume(event.target.value)}
            />
            <output>{Math.round(session.clickVolume * 100)}%</output>
          </label>
        </div>

        {timingLocked && (
          <p className="looper-settings-note">
            {t('looper.lockedHelp')}
          </p>
        )}
        <p className="looper-headphones-note">
          {t('looper.headphonesHelp')}
        </p>

        <footer>
          <button type="button" className="looper-reset-btn" onClick={reset}>{t('looper.newSession')}</button>
          <button type="button" className="workshop-brass-btn" onClick={onClose}>{t('common.done')}</button>
        </footer>
      </section>
    </div>
  );
}
