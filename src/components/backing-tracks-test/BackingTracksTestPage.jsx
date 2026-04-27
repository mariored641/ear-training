/**
 * BackingTracksTestPage.jsx — entry for the /test/backing-tracks suite.
 *
 * Three tabs corresponding to the three diagnostic areas the user reported:
 *   1. Rhythm Stability — measure timing drift vs an external metronome
 *   2. Chord Coverage   — verify the right chord notes are played
 *   3. Mixer Integrity  — verify per-genre instrument list + per-channel volume
 */

import React, { useState } from 'react'
import RhythmStabilityTab from './RhythmStabilityTab.jsx'
import ChordCoverageTab   from './ChordCoverageTab.jsx'
import MixerIntegrityTab  from './MixerIntegrityTab.jsx'

const TABS = [
  { key: 'rhythm', label: '1. Rhythm Stability', component: RhythmStabilityTab },
  { key: 'chord',  label: '2. Chord Coverage',   component: ChordCoverageTab },
  { key: 'mixer',  label: '3. Mixer Integrity',  component: MixerIntegrityTab },
]

export default function BackingTracksTestPage() {
  const [activeTab, setActiveTab] = useState('rhythm')
  const ActiveComponent = TABS.find(t => t.key === activeTab)?.component || RhythmStabilityTab

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Backing Tracks — Test Suite</h1>
        <span style={{ color: '#a0a0c0', fontSize: 12 }}>
          /test/backing-tracks · diagnostic-only · no engine fixes yet
        </span>
      </header>

      <nav style={tabsStyle}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...tabBtnStyle,
              ...(activeTab === tab.key ? activeTabBtnStyle : {}),
            }}>
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={mainStyle}>
        <ActiveComponent />
      </main>
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh',
  background: '#0e0e1a',
  color: '#e0e0f0',
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  padding: '14px 24px',
  background: '#16162a',
  borderBottom: '1px solid #2a2a3e',
}

const tabsStyle = {
  display: 'flex',
  gap: 0,
  padding: '0 24px',
  background: '#11111e',
  borderBottom: '1px solid #2a2a3e',
}

const tabBtnStyle = {
  padding: '12px 20px',
  background: 'transparent',
  color: '#a0a0c0',
  border: 'none',
  borderBottom: '3px solid transparent',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const activeTabBtnStyle = {
  color: '#fff',
  borderBottom: '3px solid #3a7eff',
  background: 'rgba(58, 126, 255, 0.06)',
}

const mainStyle = {
  padding: '20px 24px',
  maxWidth: 1100,
}
