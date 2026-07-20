import React, { useEffect, useRef } from 'react';

export default function WaveformCanvas({ peaks, playbackPosition, active, label }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const context = canvas.getContext('2d');
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const width = rect.width;
      const height = rect.height;
      context.clearRect(0, 0, width, height);
      context.strokeStyle = 'rgba(184, 146, 61, 0.24)';
      context.beginPath();
      context.moveTo(0, height / 2);
      context.lineTo(width, height / 2);
      context.stroke();

      const values = peaks?.length ? peaks : Array.from({ length: 72 }, (_, index) => (
        0.08 + (Math.sin(index * 0.8) + 1) * 0.025
      ));
      const step = width / values.length;
      context.fillStyle = peaks?.length ? '#e0b66c' : 'rgba(217, 200, 164, 0.22)';
      values.forEach((peak, index) => {
        const barHeight = Math.max(2, Math.min(height - 6, peak * (height - 8) * 1.65));
        const barWidth = Math.max(1, step * 0.55);
        context.fillRect(index * step, (height - barHeight) / 2, barWidth, barHeight);
      });
    };

    draw();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    observer?.observe(canvas);
    window.addEventListener('resize', draw);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [peaks]);

  return (
    <div className="looper-waveform" aria-label={label}>
      <canvas ref={canvasRef} aria-hidden="true" />
      {active && (
        <span
          className="looper-playhead"
          style={{ insetInlineStart: `${Math.max(0, Math.min(1, playbackPosition)) * 100}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
