import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BackingPlayer } from './BackingPlayer.jsx'
import './BackingTracksPage.css'

const BackingTracksPage = () => {
  const navigate = useNavigate()

  return (
    <div className="backing-tracks-page">
      <header className="bt-header">
        <button className="bt-back-btn" onClick={() => navigate('/')}>←</button>
        <h1 className="bt-title">Backing Tracks</h1>
      </header>
      <main className="bt-main">
        <BackingPlayer />
      </main>
    </div>
  )
}

export default BackingTracksPage
