import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackingPlayer } from './BackingPlayer.jsx'
import './BackingTracksPage.css'

const BackingTracksPage = () => {
  const navigate = useNavigate()

  // Add Aurora body class while this page is mounted
  useEffect(() => {
    document.body.classList.add('backing-page-active')
    return () => document.body.classList.remove('backing-page-active')
  }, [])

  return (
    <div className="backing-tracks-page">
      {/* Aurora background (blobs + star field) */}
      <div className="aurora" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>
      <div className="stars" aria-hidden="true" />

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
