import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EarTrainingHeader from './EarTrainingHeader';
import FeedbackOverlay from './FeedbackOverlay';
import SessionSummary from './SessionSummary';
import QuestionsCounter from './QuestionsCounter';
import BinaryToggle from './BinaryToggle';
import ChipSelector from './ChipSelector';
import { loadStoredLevel } from './LevelNavigator';
import audioPlayer from '../../../utils/AudioPlayer';
import harmonicAudioPlayer from '../../../utils/HarmonicAudioPlayer';
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
 *   questionKey(q)  — optional dedup key for anti-repeat (default: q.correctId)
 *   getOptionLabel(opt) — optional fn to compute option label dynamically (e.g. for live terminology toggles)
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
  onLevelChange,
  questionKey,
  getOptionLabel
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
  const playAbortRef = useRef(null);
  const playbackTimersRef = useRef(new Set());
  const uiTimersRef = useRef(new Set());
  const lastQuestionRef = useRef(null);

  const ctx = {
    instrument: instrument?.value,
    reference: reference?.value,
    advancement: advancement?.value ?? 'auto',
    activeChips: chips?.activeIds
  };

  const keyOf = (q) => {
    if (!q) return null;
    return questionKey ? questionKey(q) : String(q.correctId);
  };

  const clearPlaybackTimers = useCallback(() => {
    playbackTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    playbackTimersRef.current.clear();
  }, []);

  const clearUiTimers = useCallback(() => {
    uiTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    uiTimersRef.current.clear();
  }, []);

  const stopAudio = useCallback(() => {
    audioPlayer.stop?.();
    harmonicAudioPlayer.stop?.();
  }, []);

  const cancelPlayback = useCallback(() => {
    playIdRef.current++;
    playAbortRef.current?.abort();
    playAbortRef.current = null;
    clearPlaybackTimers();
    stopAudio();
  }, [clearPlaybackTimers, stopAudio]);

  const setPlaybackTimeout = useCallback((fn, delay) => {
    const timerId = setTimeout(() => {
      playbackTimersRef.current.delete(timerId);
      fn();
    }, delay);
    playbackTimersRef.current.add(timerId);
    return timerId;
  }, []);

  const setUiTimeout = useCallback((fn, delay) => {
    const timerId = setTimeout(() => {
      uiTimersRef.current.delete(timerId);
      fn();
    }, delay);
    uiTimersRef.current.add(timerId);
    return timerId;
  }, []);

  const waitForPlayback = useCallback((signal, delay) => new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    const timerId = setTimeout(() => {
      playbackTimersRef.current.delete(timerId);
      resolve(!signal?.aborted);
    }, delay);
    playbackTimersRef.current.add(timerId);
    signal?.addEventListener('abort', () => {
      clearTimeout(timerId);
      playbackTimersRef.current.delete(timerId);
      resolve(false);
    }, { once: true });
  }), []);

  const playQuestion = useCallback((q) => {
    if (!q || !onPlay) return;
    cancelPlayback();
    const myId = ++playIdRef.current;
    const controller = new AbortController();
    playAbortRef.current = controller;
    const playbackCtx = {
      ...ctx,
      signal: controller.signal,
      isCancelled: () => controller.signal.aborted || playIdRef.current !== myId,
      wait: (delay) => waitForPlayback(controller.signal, delay)
    };
    setPlaybackTimeout(() => {
      if (!playbackCtx.isCancelled()) onPlay(q, level, playbackCtx);
    }, 200);
  }, [cancelPlayback, ctx, level, onPlay, setPlaybackTimeout, waitForPlayback]);

  const startQuestion = useCallback(() => {
    setAttempted(false);
    setAnswered(null);
    setFeedback(null);
    setShowNextButton(false);
    let q = generateQuestion(level, ctx);
    let attempts = 0;
    while (
      attempts < 5 &&
      q && lastQuestionRef.current &&
      keyOf(q) === keyOf(lastQuestionRef.current)
    ) {
      q = generateQuestion(level, ctx);
      attempts++;
    }
    lastQuestionRef.current = q;
    setQuestion(q);
    playQuestion(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateQuestion, level, playQuestion, instrument?.value, reference?.value, chips?.activeIds]);

  useEffect(() => {
    setQuestionIndex(0);
    setFirstTry(0);
    setDone(false);
    lastQuestionRef.current = null;
    startQuestion();
    return () => {
      cancelPlayback();
      clearUiTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, numQuestions]);

  const goToNext = () => {
    cancelPlayback();
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
    setUiTimeout(() => setFeedback(null), 600);
    if (correct) {
      const mode = advancement?.value ?? 'auto';
      if (mode === 'manual') {
        setUiTimeout(() => setShowNextButton(true), 600);
      } else {
        setUiTimeout(goToNext, 800);
      }
    }
  };

  const handleReplay = () => {
    playQuestion(question);
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
        {[...(question?.options ?? [])].sort((a, b) => String(a.id).localeCompare(String(b.id))).map(opt => {
          const isSel = answered === opt.id;
          const isCorrect = isSel && feedback === 'correct';
          const isWrong = isSel && feedback === 'wrong';
          const label = getOptionLabel ? getOptionLabel(opt) : opt.label;
          return (
            <button
              key={opt.id}
              data-answer-state={isCorrect ? 'correct' : isWrong ? 'wrong' : isSel ? 'selected' : 'idle'}
              onClick={() => handleAnswer(opt.id)}
              disabled={(answered === opt.id && feedback === 'correct') || showNextButton}
              style={{
                ...optionBtnStyle,
                ...(isSel && !feedback ? optionSelectedStyle : {}),
                ...(isCorrect ? optionCorrectStyle : {}),
                ...(isWrong ? optionWrongStyle : {})
              }}
            >
              {label}
            </button>
          );
        })}
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
  borderTop: '1px solid var(--brass-dark)',
  margin: '8px 24px 0',
  opacity: 0.55,
};
const controlsStyle = {
  display: 'flex',
  gap: 16,
  alignItems: 'center',
  flexWrap: 'wrap',
  padding: '16px 24px',
  borderBottom: '1px solid var(--brass-dark)',
  justifyContent: 'center'
};
const promptStyle = {
  textAlign: 'center',
  fontSize: 18,
  margin: '24px 16px 8px',
  color: 'var(--paper-cream)',
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.03em'
};
const replayBtnStyle = {
  padding: '11px 26px',
  borderRadius: 4,
  border: '1px solid var(--brass-dark)',
  background: 'linear-gradient(180deg, var(--brass-bright) 0%, var(--brass) 60%, var(--brass-dark) 100%)',
  color: 'var(--wood-darkest)',
  fontSize: 15,
  fontWeight: 700,
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.04em',
  cursor: 'pointer',
  boxShadow: 'var(--shadow-inset), 0 2px 6px rgba(0,0,0,0.4)'
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
  borderRadius: '6px 14px 8px 12px',
  border: '1px solid var(--brass-dark)',
  background: 'var(--paper-aged)',
  backgroundImage:
    'radial-gradient(ellipse at 30% 20%, rgba(120, 70, 30, 0.10), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(80, 40, 15, 0.12), transparent 55%)',
  color: 'var(--ink-sepia)',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.03em',
  cursor: 'pointer',
  transition: 'all 0.15s',
  boxShadow: 'var(--shadow-paper)'
};
const optionSelectedStyle = {
  background: 'linear-gradient(180deg, var(--brass-bright) 0%, var(--brass) 60%, var(--brass-dark) 100%)',
  color: 'var(--wood-darkest)',
  border: '1px solid var(--brass-dark)',
  boxShadow: 'var(--shadow-inset), 0 2px 6px rgba(0,0,0,0.4)'
};
const optionCorrectStyle = {
  background: 'linear-gradient(180deg, #6ed988 0%, #3aac5a 60%, #267d40 100%)',
  color: '#0e2a16',
  border: '1px solid #267d40',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.4)'
};
const optionWrongStyle = {
  background: 'linear-gradient(180deg, #ff7d6c 0%, #d54a3a 60%, #8c2a1c 100%)',
  color: '#3a0c06',
  border: '1px solid #8c2a1c',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 6px rgba(0,0,0,0.4)'
};
const nextBtnStyle = {
  padding: '14px 32px',
  borderRadius: 4,
  border: '1px solid #267d40',
  background: 'linear-gradient(180deg, #6ed988 0%, #3aac5a 60%, #267d40 100%)',
  color: '#0e2a16',
  fontSize: 18,
  fontWeight: 700,
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.04em',
  cursor: 'pointer',
  boxShadow: 'var(--shadow-inset), 0 2px 6px rgba(0,0,0,0.4)'
};

export default MultipleChoiceShell;
