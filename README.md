# Ear Training Application

A comprehensive web-based ear training application for guitar students, built with React and Vite.

## Features

### Exercise 1 - Interval Recognition
- Develop relative pitch by identifying notes relative to a reference note (C)
- Customizable settings:
  - Select which notes to practice (C-B)
  - Choose octave range (1-4 octaves)
  - Play C every time or only at start
  - Auto or manual transition between questions
  - Adjustable number of questions (5-50)
- Real-time audio playback using Tone.js
- Progress tracking and summary statistics

### Exercise 2 - Fretboard Mapping
- Connect hearing with spatial mapping on the guitar fretboard
- Features:
  - Library mode with pre-made melodies
  - Random melody generation
  - Interactive visual fretboard
  - In-order or free marking modes
  - Customizable fret range and string selection
  - Visual highlighting during melody playback
- Settings:
  - Number of notes (1-10)
  - Fret range selection
  - String selection
  - Display options (note names, fret dots)
  - Marking mode (in order or free)

### Exercise 3 - Coming Soon
Melody creation over chord progressions (to be implemented in future version)

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Navigation
- **Tone.js** - Audio synthesis and playback
- **LocalStorage** - Settings and progress persistence

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ear-training
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
/src
  /components
    /common          # Shared components (Header, ProgressBar, etc.)
    /home            # Home page components
    /exercise1       # Exercise 1 components
    /exercise2       # Exercise 2 components
  /utils             # Utility functions (audio, storage, calculations)
  /constants         # Constants (notes, defaults, melody library)
  /styles            # Global styles and CSS variables
  App.jsx            # Main app component with routing
  main.jsx           # Entry point
```

## Usage

### Exercise 1 - Interval Recognition

1. Click "Start Practice" on Exercise 1 from the home page
2. Listen to the reference note C and the target note
3. Click the note button you think you heard
4. Get immediate feedback (green for correct, red for incorrect)
5. Continue through the session
6. View your summary statistics at the end

**Tips:**
- Beginners: Start with fewer notes (3-4) and 1 octave
- Advanced: Use all 12 notes across multiple octaves
- Try "C only at start" mode for a greater challenge

### Exercise 2 - Fretboard Mapping

1. Click "Start Practice" on Exercise 2 from the home page
2. Listen to the melody
3. Find the notes on your real guitar
4. Mark the positions on the virtual fretboard
5. Click "Play Melody" to hear it again with visual highlights
6. Complete all notes to move to the next melody

**Tips:**
- Beginners: Use library mode with simple melodies
- Practice specific fret ranges or strings
- Try "free" marking mode for more challenging practice

## Settings

Both exercises save your settings to localStorage, so your preferences persist between sessions.

### Accessing Settings
Click the ⚙️ button during any exercise to open the settings panel.

### Resetting Progress
Use the "Reset Exercise" button in settings to start fresh.

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Audio Requirements

The application uses the Web Audio API through Tone.js. Make sure:
- Your browser supports Web Audio API
- Audio is not muted
- You interact with the page before audio plays (browser requirement)

## License

This project is licensed under the MIT License.

## Acknowledgments

Built following comprehensive specifications by Mario with assistance from Claude.

## Future Enhancements

- Exercise 3: Melody creation over chord progressions
- More melody library content
- User accounts and cloud progress sync
- Additional instruments support
- More advanced ear training exercises
