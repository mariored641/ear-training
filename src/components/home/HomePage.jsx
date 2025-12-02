import React from 'react';
import ExerciseCard from './ExerciseCard';
import './HomePage.css';

const HomePage = () => {
  const exercises = [
    {
      id: 1,
      title: 'Interval Recognition Relative to C',
      description: 'This exercise develops relative pitch - the ability to identify notes relative to a reference point. The student hears the note C as an anchor, followed by another note, and must identify which note they heard.',
      pedagogicalGoals: [
        'Develop relative pitch',
        'Build tonal memory',
        'Ability to hear intervals as internal relationships',
        'Preparation for melodic transcription and solfège'
      ],
      practiceMethods: [
        'For Beginners: Start with 3-4 notes only in one octave, with "C every time"',
        'Intermediate Level: Add more notes and expand to 2 octaves',
        'Advanced: Switch to "C only at start" to develop independent tonal memory',
        'Challenging: Use all 12 chromatic notes across 3-4 octaves'
      ],
      isAvailable: true
    },
    {
      id: 2,
      title: 'Finding Notes and Melodies on the Guitar Neck',
      description: 'This exercise combines hearing with spatial mapping on the guitar. The student hears notes or melodies, finds them on their real guitar, then marks the locations on a virtual fretboard.',
      pedagogicalGoals: [
        'Connection between hearing and motor skills',
        'Spatial mapping of the guitar neck',
        'Awareness of fretboard topography',
        'Preparation for transcription and improvisation',
        'Develop "knowledge" of where each note is located'
      ],
      practiceMethods: [
        'For Beginners: Single notes on one string, first 5 frets',
        'Intermediate Level: 2-3 notes in sequence, multiple strings, stepwise motion',
        'Advanced: Longer melodies with leaps and chromaticism',
        'Challenging: "Library" mode with pre-made melodies that progress in difficulty',
        'Expert: "Free" mode without sequential marking, full fretboard range'
      ],
      isAvailable: true
    },
    {
      id: 3,
      title: 'Creating Melodies over Chord Progressions',
      description: 'This exercise will help you create melodies over chord progressions. Full specification coming in the next version.',
      pedagogicalGoals: [
        'To be completed in next version'
      ],
      practiceMethods: [
        'Coming soon'
      ],
      isAvailable: false
    }
  ];

  return (
    <div className="home-page">
      <header className="home-header">
        <h1 className="home-title">Ear Training 🎵</h1>
        <p className="home-subtitle">Ear Training Application</p>
      </header>

      <div className="home-content">
        {exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exerciseId={exercise.id}
            title={exercise.title}
            description={exercise.description}
            pedagogicalGoals={exercise.pedagogicalGoals}
            practiceMethods={exercise.practiceMethods}
            isAvailable={exercise.isAvailable}
          />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
