import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from './EarTrainingHeader';
import FeedbackOverlay from './FeedbackOverlay';
import SessionSummary from './SessionSummary';
import QuestionsCounter from './QuestionsCounter';
import BinaryToggle from './BinaryToggle';
import ChipSelector from './ChipSelector';
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
 *   generateQuestion(level, ctx) — must return { id, options:[{id,label}], correctId, prompt? }
 *                                  ctx = { instrument, reference, advancement, activeChips }
 *   onPlay(question, level, ctx) — async play handler
 *   instrument      — { value, onChange }  default 'piano'|'guitar' toggle
 *   reference       — { value, onChange }  cadence|chord|note toggle (optional)
 *   advancement     — { value, onChange }  auto|manual question advancement
 *   chips           — { items, activeIds, onToggle, minActive }  optional component-chip selector
 *   extraControls   — optional ReactNode rendered in the controls bar
 *   renderPrompt    — optional render function for the question prompt area
 *   replayLabel     — override "▶ נגן שוב"
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
  instrument,
  reference,
  advancement,
  chips,
  extraControls,
  renderPrompt,
  replayLabel = '▶ נגן שוב',
  onLevelChange
}) => {
  const navigate = useNavigate();
  const storageKey = `ear-training:${id}:level`;
  const numQKey = `ear-training:${id}:numQuestions`;
  const [level, setLevelInternal] = useState(() => loadStoredLevel(storageKey, defaultLevel));
  const setLevel = (n) => { setLevelInternal(n); onLevelChange?.(n); };
  useEffect(() => { onLevelChange?.(level); /* eslint-disable-next-line */ }, []);
  const [numQuestions, setNumQuestionsState] = useState(() => {
    const stored = parseInt(localStorage.getItem(numQKey), 10);
    return !isNaN(stored) ? stored : defaultNumQuestions;
  });
  const setNumQuestions = (n) => { setNumQuestionsState(n); localStorage.setItem(numQKey, String(n)); };
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [answered, setAnswered] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [firstTry, setFirstTry] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [done, setDone] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const playIdRef = useRef(0);

  const ctx = {
    instrument: instrument?.value,
    reference: reference?.value,
    advancement: advancement?.value ?? 'auto',
    activeChips: chips?.activeIds
  };

  const startQuestion = useCallback(() => {
    setAttempted(false);
    setAnswered(null);
    setFeedback(null);
    setShowNextButton(false);
    const q = generateQuestion(level, ctx);
    setQuestion(q);
    if (q && onPlay) {
      const myId = ++playIdRef.current;
      setTimeout(() => { if (playIdRef.current === myId) onPlay(q, level, ctx); }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateQuestion, level, onPlay, instrument?.value, reference?.value, chips?.activeIds]);

  useEffect(() => {
    setQuestionIndex(0);
    setFirstTry(0);
    setDone(false);
    startQuestion();
    return () => { playIdRef.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, numQuestions]);

  const goToNext = () => {
    if (questionIndex + 1 >= numQuestions) {
      setDone(true);
    } else {
      setQuestionIndex(p => p + 1);
      startQuestion();
    }
  };

  const handleAnswer = (optionId) => {
    if (!question || done || showNextButton) return;
    const correct = optionId === question.correctId;
    setAnswered(optionId);
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct && !attempted) {
      setFirstTry(p => p + 1);
    }
    setAttempted(true);
    setTimeout(() => setFeedback(null), 600);
    if (correct) {
      const mode = advancement?.value ?? 'auto';
      if (mode === 'manual') {
        setTimeout(() => setShowNextButton(true), 600);
      } else {
        setTimeout(goToNext, 800);
      }
    }
  };

  const handleReplay = () => {
    if (question && onPlay) onPlay(question, level, ctx);
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

      {renderPrompt
        ? renderPrompt(question, level)
        : (question?.prompt && <div style={promptStyle}>{question.prompt}</div>)}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={handleReplay} style={replayBtnStyle}>{replayLabel}</button>
      </div>

      <div className="et-mc-options" style={optionsStyle}>
        {[...(question?.options ?? [])].sort((a, b) => String(a.id).localeCompare(String(b.id))).map(opt => (
          <button
            key={opt.id}
            onClick={() => handleAnswer(opt.id)}
            disabled={(answered === opt.id && feedback === 'correct') || showNextButton}
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

      {showNextButton && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={goToNext} style={nextBtnStyle}>הבא ←</button>
        </div>
      )}

      <div style={settingsDivider} />

      <div className="et-mc-controls" style={controlsStyle}>
        <QuestionsCounter value={numQuestions} onChange={setNumQuestions} min={3} max={30} />
        {instrument && (
          <BinaryToggle
            label="כלי"
            options={[
              { value: 'piano', label: 'פסנתר' },
              { value: 'guitar', label: 'גיטרה' }
            ]}
            value={instrument.value}
            onChange={instrument.onChange}
          />
        )}
        {reference && (
          <BinaryToggle
            label="רפרנס"
            options={[
              { value: 'cadence', label: 'קדנצה' },
              { value: 'chord', label: 'אקורד' },
              { value: 'note', label: 'תו' },
              { value: 'none', label: 'ללא' }
            ]}
            value={reference.value}
            onChange={reference.onChange}
          />
        )}
        {advancement && (
          <BinaryToggle
            label="מעבר"
            options={[
              { value: 'auto', label: 'אוטומטי' },
              { value: 'manual', label: 'ידני' }
            ]}
            value={advancement.value}
            onChange={advancement.onChange}
          />
        )}
        {extraControls}
      </div>

      {chips && chips.items?.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 16px 24px' }}>
          <ChipSelector
            items={chips.items}
            activeIds={chips.activeIds}
            onToggle={chips.onToggle}
            minActive={chips.minActive ?? 2}
          />
        </div>
      )}

      <FeedbackOverlay state={feedback} />
    </div>
  );
};

const settingsDivider = {
  borderTop: '1px solid var(--border-color, #eee)',
  margin: '8px 24px 0',
  opacity: 0.6,
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
const nextBtnStyle = {
  padding: '14px 32px',
  borderRadius: 12,
  border: '2px solid #2dbb5b',
  background: '#2dbb5b',
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer'
};

export default MultipleChoiceShell;
