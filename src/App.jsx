import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/home/HomePage';

// Placeholder components - will be implemented later
const Exercise1 = React.lazy(() => import('./components/exercise1/Exercise1'));
const Exercise2 = React.lazy(() => import('./components/exercise2/Exercise2'));

function App() {
  return (
    <Router>
      <React.Suspense fallback={<div className="container">Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/exercise1" element={<Exercise1 />} />
          <Route path="/exercise2" element={<Exercise2 />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;
