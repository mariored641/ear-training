import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BackingPlayer } from './BackingPlayer.jsx'
import './BackingTracksPage.css'

const BackingTracksPage = () => {
  const navigate = useNavigate()

  return (
    <div className="backing-tracks-page">
      <header className="bt-header">
        <div className="bt-header-left">
          <button className="bt-back-btn" onClick={() => navigate('/')}>←</button>
        </div>
        <div className="bt-header-center">
          <h1 className="bt-title">🎵 Backing Tracks</h1>
          <p className="bt-subtitle">חטיבת ליווי</p>
        </div>
        <div className="bt-header-right" />
      </header>

      <main className="bt-main">
        <BackingPlayer />
      </main>
    </div>
  )
}

export default BackingTracksPage
