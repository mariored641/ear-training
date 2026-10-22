import { useEffect, useRef, useState } from 'react';
import RhythmAudioPlayer from '../../utils/RhythmAudioPlayer';
import { activeCells } from '../../utils/rhythm/patterns';

export default function useRhythmPlayback(pattern, bpm, soundSet, isPlaying, setIsPlaying) {
  const latest = useRef();
  latest.current = { pattern, bpm, soundSet };
  const [currentCells, setCurrentCells] = useState({});
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    let cancelled = false;
    let frame;
    setPlaybackError(false);
    const draw = () => {
      const cells = activeCells(latest.current.pattern, RhythmAudioPlayer.position());
      setCurrentCells(previous => JSON.stringify(previous) === JSON.stringify(cells) ? previous : cells);
      frame = requestAnimationFrame(draw);
    };
    RhythmAudioPlayer.init(latest.current.soundSet).then(() => {
      if (cancelled) return;
      const config = latest.current;
      RhythmAudioPlayer.start(config.pattern, config.bpm, config.soundSet);
      draw();
    }).catch(error => {
      if (cancelled) return;
      console.error('Rhythm playback failed:', error);
      setPlaybackError(true);
      setIsPlaying(false);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      RhythmAudioPlayer.stop();
      setCurrentCells({});
    };
  }, [isPlaying, setIsPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    RhythmAudioPlayer.update(pattern, bpm, soundSet);
    let cancelled = false;
    // Samples can load while a different sound set is already playing.
    RhythmAudioPlayer.init(soundSet).catch(error => {
      if (cancelled) return;
      console.error('Rhythm sounds failed:', error);
      setPlaybackError(true);
      setIsPlaying(false);
    });
    return () => { cancelled = true; };
  }, [pattern, bpm, soundSet, isPlaying, setIsPlaying]);

  return { currentCells: isPlaying ? currentCells : {}, playbackError,
    handlePlayStop: () => setIsPlaying(playing => !playing) };
}
