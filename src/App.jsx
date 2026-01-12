import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/home/HomePage';

// Lazy load category screens
const MelodicCategoryScreen = React.lazy(() => import('./components/category/MelodicCategoryScreen'));
const HarmonicCategoryScreen = React.lazy(() => import('./components/category/HarmonicCategoryScreen'));

// Lazy load exercises
const Exercise1 = React.lazy(() => import('./components/exercise1/Exercise1'));
const Exercise2 = React.lazy(() => import('./components/exercise2/Exercise2'));
const Exercise4 = React.lazy(() => import('./components/exercise4/Exercise4'));
const Exercise4A = React.lazy(() => import('./components/exercise4a/Exercise4A'));
const Exercise4B = React.lazy(() => import('./components/exercise4b/Exercise4B'));
const Exercise4C = React.lazy(() => import('./components/exercise4c/Exercise4C'));

function App() {
  return (
    <Router>
      <React.Suspense fallback={<div className="container">Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* Category Screens */}
          <Route path="/category/melodic" element={<MelodicCategoryScreen />} />
          <Route path="/category/harmonic" element={<HarmonicCategoryScreen />} />

          {/* Melodic Exercises */}
          <Route path="/exercise/1" element={<Exercise1 />} />
          <Route path="/exercise/2" element={<Exercise2 />} />

          {/* Harmonic Exercises */}
          <Route path="/exercise/4a" element={<Exercise4A />} />
          <Route path="/exercise/4b" element={<Exercise4B />} />
          <Route path="/exercise/4c" element={<Exercise4C />} />

          {/* Rhythm Exercise (direct access, no category screen) */}
          <Route path="/exercise/4" element={<Exercise4 />} />

          {/* Legacy routes for backward compatibility */}
          <Route path="/exercise1" element={<Exercise1 />} />
          <Route path="/exercise2" element={<Exercise2 />} />
          <Route path="/exercise4" element={<Exercise4 />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;
