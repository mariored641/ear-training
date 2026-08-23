import React from 'react'
import { useTranslation } from 'react-i18next'

const MIN_BARS = 1
const MAX_BARS = 64

export function BarCountSelector({ barCount, onBarCountChange }) {
  const { t } = useTranslation()
  return (
    <div className="bar-count-selector">
      <span className="bar-count-label">{t('backing.bars')}</span>
      <button
        className="bar-step-btn"
        onClick={() => onBarCountChange(Math.max(MIN_BARS, barCount - 1))}
        disabled={barCount <= MIN_BARS}
        aria-label={t('backing.deleteBar')}
      >−</button>
      <span className="bar-count-value">{barCount}</span>
      <button
        className="bar-step-btn"
        onClick={() => onBarCountChange(Math.min(MAX_BARS, barCount + 1))}
        disabled={barCount >= MAX_BARS}
        aria-label={t('rhythm.addBeat')}
      >+</button>
    </div>
  )
}
