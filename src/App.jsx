import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/home/HomePage';

// Lazy load category screens
const MelodicCategoryScreen = React.lazy(() => import('./components/category/MelodicCategoryScreen'));
const HarmonicCategoryScreen = React.lazy(() => import('./components/category/HarmonicCategoryScreen'));
const DictationCategoryScreen = React.lazy(() => import('./components/category/DictationCategoryScreen'));

// Ear-Training Hub + 6 Sub-Screens (new unified navigation)
const EarTrainingHub = React.lazy(() => import('./components/ear-training/hub/EarTrainingHub'));
const MelodicSubScreen = React.lazy(() => import('./components/ear-training/melodic/MelodicSubScreen'));
const HarmonicIsolatedSubScreen = React.lazy(() => import('./components/ear-training/harmonic-isolated/HarmonicIsolatedSubScreen'));
const FunctionalSubScreen = React.lazy(() => import('./components/ear-training/functional/FunctionalSubScreen'));
const VoiceLeadingSubScreen = React.lazy(() => import('./components/ear-training/voice-leading/VoiceLeadingSubScreen'));
const SolfegeSubScreen = React.lazy(() => import('./components/ear-training/solfege/SolfegeSubScreen'));
const GuitarSubScreen = React.lazy(() => import('./components/ear-training/guitar/GuitarSubScreen'));
const ExercisePlaceholder = React.lazy(() => import('./components/ear-training/shared/ExercisePlaceholder'));

// Phase 3 — upgraded exercises with new UI/levels
const ExerciseM1 = React.lazy(() => import('./components/ear-training/melodic/ExerciseM1'));
const ExerciseG1 = React.lazy(() => import('./components/ear-training/guitar/ExerciseG1'));
const ExerciseH1 = React.lazy(() => import('./components/ear-training/harmonic-isolated/ExerciseH1'));
const ExerciseH4 = React.lazy(() => import('./components/ear-training/harmonic-isolated/ExerciseH4'));
const ExerciseF2 = React.lazy(() => import('./components/ear-training/functional/ExerciseF2'));

// Phase 4 — new exercises
const ExerciseM2 = React.lazy(() => import('./components/ear-training/melodic/ExerciseM2'));
const ExerciseM3 = React.lazy(() => import('./components/ear-training/melodic/ExerciseM3'));
const ExerciseH2 = React.lazy(() => import('./components/ear-training/harmonic-isolated/ExerciseH2'));
const ExerciseH3 = React.lazy(() => import('./components/ear-training/harmonic-isolated/ExerciseH3'));
const ExerciseF0 = React.lazy(() => import('./components/ear-training/functional/ExerciseF0'));
const ExerciseF1 = React.lazy(() => import('./components/ear-training/functional/ExerciseF1'));
const ExerciseF3 = React.lazy(() => import('./components/ear-training/functional/ExerciseF3'));
const ExerciseF4 = React.lazy(() => import('./components/ear-training/functional/ExerciseF4'));
const ExerciseV1 = React.lazy(() => import('./components/ear-training/voice-leading/ExerciseV1'));
const ExerciseV2 = React.lazy(() => import('./components/ear-training/voice-leading/ExerciseV2'));
const ExerciseS1 = React.lazy(() => import('./components/ear-training/solfege/ExerciseS1'));
const ExerciseS2 = React.lazy(() => import('./components/ear-training/solfege/ExerciseS2'));

// Lazy load exercises
const Exercise1 = React.lazy(() => import('./components/exercise1/Exercise1'));
const Exercise2 = React.lazy(() => import('./components/exercise2/Exercise2'));
const Exercise3 = React.lazy(() => import('./components/exercise3/Exercise3'));
const Exercise4 = React.lazy(() => import('./components/exercise4/Exercise4'));
const Exercise4A = React.lazy(() => import('./components/exercise4a/Exercise4A'));
const Exercise4B = React.lazy(() => import('./components/exercise4b/Exercise4B'));
const Exercise4C = React.lazy(() => import('./components/exercise4c/Exercise4C'));

// Scale Positions module
const ScalePositionsPage = React.lazy(() => import('./components/positions/ScalePositionsPage'));

// Backing Tracks module
const BackingTracksPage = React.lazy(() => import('./components/backing-tracks/BackingTracksPage'));

// Feedback module
const FeedbackPage = React.lazy(() => import('./components/feedback/FeedbackPage'));

// Rhythm Training module (new)
const RhythmTraining = React.lazy(() => import('./components/rhythm-training/RhythmTraining'));
const SoundFontTest = React.lazy(() => import('./components/soundfont-test/SoundFontTest'));
const StyleParserTest = React.lazy(() => import('./components/style-parser-test/StyleParserTest'));
const ChordEngineTest = React.lazy(() => import('./components/chord-engine-test/ChordEngineTest'));
const BackingEngineTest = React.lazy(() => import('./components/backing-engine-test/BackingEngineTest'));
const TimingTestPage    = React.lazy(() => import('./components/timing-test/TimingTestPage'));
const BackingTracksTestPage = React.lazy(() => import('./components/backing-tracks-test/BackingTracksTestPage'));

function App() {
  return (
    <Router>
      <React.Suspense fallback={<div className="container">Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* Category Screens (legacy — kept as fallback during ear-training refactor) */}
          <Route path="/category/melodic" element={<MelodicCategoryScreen />} />
          <Route path="/category/harmonic" element={<HarmonicCategoryScreen />} />
          <Route path="/category/dictation" element={<DictationCategoryScreen />} />

          {/* Ear-Training Hub + Sub-Screens (new unified navigation) */}
          <Route path="/category/ear-training" element={<EarTrainingHub />} />
          <Route path="/category/ear-training/melodic" element={<MelodicSubScreen />} />
          <Route path="/category/ear-training/harmonic-isolated" element={<HarmonicIsolatedSubScreen />} />
          <Route path="/category/ear-training/functional" element={<FunctionalSubScreen />} />
          <Route path="/category/ear-training/voice-leading" element={<VoiceLeadingSubScreen />} />
          <Route path="/category/ear-training/solfege" element={<SolfegeSubScreen />} />
          <Route path="/category/ear-training/guitar" element={<GuitarSubScreen />} />

          {/* Phase-1 placeholders for the 17 ear-training exercises */}
          {/* Phase 3: upgraded exercises with new UI */}
          <Route path="/exercise/M1" element={<ExerciseM1 />} />
          <Route path="/exercise/G1" element={<ExerciseG1 />} />
          <Route path="/exercise/H1" element={<ExerciseH1 />} />
          <Route path="/exercise/H4" element={<ExerciseH4 />} />
          <Route path="/exercise/F2" element={<ExerciseF2 />} />

          {/* Phase 4: 12 new exercises (minimal working implementations) */}
          <Route path="/exercise/M2" element={<ExerciseM2 />} />
          <Route path="/exercise/M3" element={<ExerciseM3 />} />
          <Route path="/exercise/H2" element={<ExerciseH2 />} />
          <Route path="/exercise/H3" element={<ExerciseH3 />} />
          <Route path="/exercise/F0" element={<ExerciseF0 />} />
          <Route path="/exercise/F1" element={<ExerciseF1 />} />
          <Route path="/exercise/F3" element={<ExerciseF3 />} />
          <Route path="/exercise/F4" element={<ExerciseF4 />} />
          <Route path="/exercise/V1" element={<ExerciseV1 />} />
          <Route path="/exercise/V2" element={<ExerciseV2 />} />
          <Route path="/exercise/S1" element={<ExerciseS1 />} />
          <Route path="/exercise/S2" element={<ExerciseS2 />} />

          {/* Melodic Exercises */}
          <Route path="/exercise/1" element={<Exercise1 />} />
          <Route path="/exercise/2" element={<Exercise2 />} />
          <Route path="/exercise/3" element={<Exercise3 />} />

          {/* Harmonic Exercises */}
          <Route path="/exercise/4a" element={<Exercise4A />} />
          <Route path="/exercise/4b" element={<Exercise4B />} />
          <Route path="/exercise/4c" element={<Exercise4C />} />

          {/* Rhythm Exercise (direct access, no category screen) */}
          <Route path="/exercise/4" element={<Exercise4 />} />

          {/* Scale Positions module */}
          <Route path="/positions" element={<ScalePositionsPage />} />

          {/* Backing Tracks module */}
          <Route path="/backing-tracks" element={<BackingTracksPage />} />

          {/* Feedback module */}
          <Route path="/feedback" element={<FeedbackPage />} />

          {/* Rhythm Training module */}
          <Route path="/rhythm-training" element={<RhythmTraining />} />

          {/* Dev: SoundFont test (Stage 1) */}
          <Route path="/soundfont-test" element={<SoundFontTest />} />

          {/* Dev: Style Parser test (Stage 2) */}
          <Route path="/style-parser-test" element={<StyleParserTest />} />

          {/* Dev: Chord Engine test (Stage 3) */}
          <Route path="/chord-engine-test" element={<ChordEngineTest />} />

          {/* Dev: Backing Engine test (Stage 5) */}
          <Route path="/engine-test" element={<BackingEngineTest />} />

          {/* Dev: Timing analysis test */}
          <Route path="/timing-test" element={<TimingTestPage />} />

          {/* Dev: Backing Tracks test suite (rhythm + chord coverage + mixer) */}
          <Route path="/test/backing-tracks" element={<BackingTracksTestPage />} />

          {/* Legacy routes for backward compatibility */}
          <Route path="/exercise1" element={<Exercise1 />} />
          <Route path="/exercise2" element={<Exercise2 />} />
          <Route path="/exercise3" element={<Exercise3 />} />
          <Route path="/exercise4" element={<Exercise4 />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;
