import React, { useEffect, useRef } from 'react'

const BAR_COUNT = 24

export function Visualizer({ isPlaying, currentBar, barCount }) {
  const barsRef = useRef([])

  useEffect(() => {
    if (!isPlaying) {
      barsRef.current.forEach(b => { if (b) b.style.height = '4px' })
      return
    }

    let frame
    function animate() {
      barsRef.current.forEach((b, i) => {
        if (!b) return
        const base = 4
        const beat = currentBar % 4
        const isBeat = i % (Math.floor(BAR_COUNT / 4)) === beat
        const noise = Math.random() * 28
        const beatBoost = isBeat ? 16 : 0
        b.style.height = `${base + noise + beatBoost}px`
      })
      frame = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, currentBar])

  return (
    <div className="visualizer">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          className="visualizer-bar"
          ref={el => (barsRef.current[i] = el)}
        />
      ))}
    </div>
  )
}
