import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from './EarTrainingHeader';
import FeedbackOverlay from './FeedbackOverlay';
import SessionSummary from './SessionSummary';
import QuestionsCounter from './QuestionsCounter';
import { loadStoredLevel } from './LevelNavigator';
import './earTrainingShared.css';

/**
 * Generic multiple-choice exercise shell.
 *
 * Props:
 *   id              — exercise id (e.g. 'M2')
 *   titleHebrew     — display title
 *   backTo          — back nav route
 *   levels          — [{ number, label, ... }]
 *   defaultLevel    — initial level number (default 1)
 *   defaultNumQuestions — default count (10)
 *   generateQuestion(level) — must return { id, options:[{id,label}], correctId, prompt? }
 *   onPlay(question, level, helpers) — async play handler
 *   instrumentToggle — { value, onChange, options } optional
 *   extraControls    — optional ReactNode rendered in the controls bar
 *   onLevelChange(newLevel) — called when level changes (parent may reset state)
 */
const MultipleChoiceShell = ({
  id,
  titleHebrew,
  backTo,
  levels,
  defaultLevel = 1,
  defaultNumQuestions = 10,
  generateQuestion,
  onPlay,
  instrumentToggle,
  extraControls
}) => {
  const navigate = useNavigate();
  const storageKey = `ear-training:${id}:level`;
  const [level, setLevel] = useState(() => loadStoredLevel(storageKey, defaultLevel));
  const [numQuestions, setNumQuestions] = useState(defaultNumQuestions);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [answered, setAnswered] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [firstTry, setFirstTry] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [done, setDone] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const startQuestion = useCallback(() => {
    setAttempted(false);
    setAnswered(null);
    setFeedback(null);
    const q = generateQuestion(level);
    setQuestion(q);
    if (autoPlay && q && onPlay) {
      setTimeout(() => onPlay(q, level), 200);
    }
  }, [generateQuestion, level, onPlay, autoPlay]);

  useEffect(() => {
    setQuestionIndex(0);
    setFirstTry(0);
    setDone(false);
    startQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, numQuestions]);

  const handleAnswer = (optionId) => {
    if (!question || done) return;
    const correct = optionId === question.correctId;
    setAnswered(optionId);
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct && !attempted) {
      setFirstTry(p => p + 1);
    }
    setAttempted(true);
    setTimeout(() => setFeedback(null), 600);
    if (correct) {
      setTimeout(() => {
        if (questionIndex + 1 >= numQuestions) {
          setDone(true);
        } else {
          setQuestionIndex(p => p + 1);
          startQuestion();
        }
      }, 800);
    }
  };

  const handleReplay = () => {
    if (question && onPlay) onPlay(question, level);
  };

  if (done) {
    return (
      <div>
        <EarTrainingHeader
          exerciseTitle={`${id} — ${titleHebrew}`}
          levels={levels}
          currentLevel={level}
          onLevelChange={setLevel}
          storageKey={storageKey}
          onBack={() => navigate(backTo)}
        />
        <SessionSummary
          total={numQuestions}
          firstTry={firstTry}
          onRetry={() => {
            setQuestionIndex(0);
            setFirstTry(0);
            setDone(false);
            startQuestion();
          }}
          onBack={() => navigate(backTo)}
          levelLabel={levels.find(l => l.number === level)?.label}
        />
      </div>
    );
  }

  return (
    <div className="et-mc-shell" style={{ direction: 'rtl' }}>
      <EarTrainingHeader
        exerciseTitle={`${id} — ${titleHebrew}`}
        levels={levels}
        currentLevel={level}
        onLevelChange={setLevel}
        storageKey={storageKey}
        onBack={() => navigate(backTo)}
        progressCurrent={questionIndex}
        progressTotal={numQuestions}
      />

      <div className="et-mc-controls" style={controlsStyle}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} min={3} max={30} />
        {instrumentToggle && (
          <div>
            {/* caller renders their own toggle component */}
            {instrumentToggle}
          </div>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <input type="checkbox" checked={autoPlay} onChange={e => setAutoPlay(e.target.checked)} />
          ניגון אוטומטי
        </label>
        {extraControls}
      </div>

      {question?.prompt && (
        <div style={promptStyle}>{question.prompt}</div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={handleReplay} style={replayBtnStyle}>▶ נגן שוב</button>
      </div>

      <div className="et-mc-options" style={optionsStyle}>
        {question?.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleAnswer(opt.id)}
            disabled={answered === opt.id && feedback === 'correct'}
            style={{
              ...optionBtnStyle,
              ...(answered === opt.id && feedback === 'correct' ? optionCorrectStyle : {}),
              ...(answered === opt.id && feedback === 'wrong' ? optionWrongStyle : {})
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const controlsStyle = {
  display: 'flex',
  gap: 16,
  alignItems: 'center',
  flexWrap: 'wrap',
  padding: '16px 24px',
  borderBottom: '1px solid var(--border-color, #eee)',
  justifyContent: 'center'
};
const promptStyle = {
  textAlign: 'center',
  fontSize: 18,
  margin: '24px 16px 8px',
  color: 'var(--color-text, #222)'
};
const replayBtnStyle = {
  padding: '12px 28px',
  borderRadius: 12,
  border: '2px solid var(--color-primary, #4a90e2)',
  background: 'var(--color-primary, #4a90e2)',
  color: '#fff',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer'
};
const optionsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  justifyContent: 'center',
  padding: '32px 16px',
  maxWidth: 720,
  margin: '0 auto'
};
const optionBtnStyle = {
  minWidth: 120,
  padding: '14px 18px',
  borderRadius: 10,
  border: '2px solid var(--border-color, #ddd)',
  background: '#fff',
  color: 'var(--color-text, #222)',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s'
};
const optionCorrectStyle = {
  background: '#2dbb5b', color: '#fff', borderColor: '#2dbb5b'
};
const optionWrongStyle = {
  background: '#e74c3c', color: '#fff', borderColor: '#e74c3c'
};

export default MultipleChoiceShell;
