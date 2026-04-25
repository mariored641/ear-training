import React, { useState } from 'react';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
import audioPlayer from '../../../utils/AudioPlayer';
import { CHORD_DEFINITIONS, EXTENDED_CHORDS } from '../../../constants/harmonicDefaults';
import TernaryToggle from './TernaryToggle';
import './earTrainingShared.css';

/**
 * Plays a tonal reference (cadence / tonic chord / tonic note).
 * Props:
 *   type: 'cadence' | 'chord' | 'note'
 *   onTypeChange?: (type) => void  — if present, shows selector
 *   tonic: 'C' | 'D' | ...
 *   mode?: 'major' | 'minor' (default 'major')
 *   instrument?: 'piano' | 'guitar'
 *   cadenceType?: 'PAC' | 'IAC' | 'HC' | 'Plagal' | 'Deceptive' (default 'PAC')
 *   label?: string
 *   showSelector?: boolean
 */
const ReferencePlayer = ({
  type,
  onTypeChange,
  tonic = 'C',
  mode = 'major',
  instrument = 'piano',
  cadenceType = 'PAC',
  label = 'רפרנס',
  showSelector = false
}) => {
  const [playing, setPlaying] = useState(false);

  const handlePlay = async () => {
    if (playing) return;
    setPlaying(true);
    try {
      if (!harmonicAudioPlayer.initialized) await harmonicAudioPlayer.init();
      if (instrument && instrument !== harmonicAudioPlayer.instrument) {
        await harmonicAudioPlayer.setInstrument(instrument);
      }
      if (type === 'cadence') {
        await harmonicAudioPlayer.playCadence(cadenceType, tonic, instrument, mode);
      } else if (type === 'chord') {
        const chordName = mode === 'major' ? tonic : `${tonic}m`;
        const notes = resolveChordNotes(chordName);
        if (notes) harmonicAudioPlayer.playChord(notes, 1.5, 'strummed');
      } else if (type === 'note') {
        if (audioPlayer && typeof audioPlayer.playNote === 'function') {
          await audioPlayer.playNote(`${tonic}4`, 1.0, instrument);
        } else {
          harmonicAudioPlayer.playNote(`${tonic}4`, 1.0);
        }
      }
    } finally {
      setTimeout(() => setPlaying(false), 600);
    }
  };

  function resolveChordNotes(name) {
    if (CHORD_DEFINITIONS[name]) return CHORD_DEFINITIONS[name];
    if (EXTENDED_CHORDS[name]) return EXTENDED_CHORDS[name].notes;
    return null;
  }

  return (
    <div className="et-reference">
      {showSelector && onTypeChange && (
        <TernaryToggle
          label={label}
          options={[
            { value: 'cadence', label: 'קדנצה' },
            { value: 'chord', label: 'אקורד' },
            { value: 'note', label: 'תו' }
          ]}
          value={type}
          onChange={onTypeChange}
        />
      )}
      <button
        type="button"
        className="et-reference-btn"
        onClick={handlePlay}
        disabled={playing}
        aria-label="נגן רפרנס"
      >
        {playing ? '🔊' : '▶'} נגן רפרנס
      </button>
    </div>
  );
};

export default ReferencePlayer;
