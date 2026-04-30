import { useEffect } from 'react';

/**
 * Stop the player on unmount. Drop-in for exercises that lacked a cleanup effect.
 * Pass any object with a .stop() method (AudioPlayer, HarmonicAudioPlayer,
 * rhythmTrainingAudio, etc).
 */
export default function useAudioCleanup(player) {
  useEffect(() => {
    return () => {
      if (player && typeof player.stop === 'function') {
        player.stop();
      }
    };
  }, [player]);
}
