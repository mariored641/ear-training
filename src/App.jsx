import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/home/HomePage';

// Lazy load category screens
const MelodicCategoryScreen = React.lazy(() => import('./components/category/MelodicCategoryScreen'));
const HarmonicCategoryScreen = React.lazy(() => import('./components/category/HarmonicCategoryScreen'));
const DictationCategoryScreen = React.lazy(() => import('./components/category/DictationCategoryScreen'));

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

function App() {
  return (
    <Router>
      <React.Suspense fallback={<div className="container">Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* Category Screens */}
          <Route path="/category/melodic" element={<MelodicCategoryScreen />} />
          <Route path="/category/harmonic" element={<HarmonicCategoryScreen />} />
          <Route path="/category/dictation" element={<DictationCategoryScreen />} />

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
