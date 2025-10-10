import React, { useEffect, useState, useRef } from "react";
import quizData from './data/quiz.json'; // deve contenere: [{id, question, options:[], answer:[indices]}]

const MAX_TIME_SECONDS = 60 * 60; // 60 minuti

function getRandomQuestions(data, n) {
  // Verifica domande uniche sia per id che per stringa della domanda
  // Mappa per id
  const uniqueIdMap = new Map();
  data.forEach(item => {
    // Usa anche la domanda come discriminante per sicurezza
    const key = `${item.id}_${item.question}`;
    if (!uniqueIdMap.has(key)) uniqueIdMap.set(key, item);
  });
  const uniqueQuestions = Array.from(uniqueIdMap.values());

  // Shuffle Fisher-Yates
  for (let i = uniqueQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueQuestions[i], uniqueQuestions[j]] = [uniqueQuestions[j], uniqueQuestions[i]];
  }
  // Prendi i primi n, senza alcuna ripetizione
  return uniqueQuestions.slice(0, Math.min(n, uniqueQuestions.length));
}



export default function App() {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showLiveStats, setShowLiveStats] = useState(false); // live stats toggle
  const timerRef = useRef();

  // Avvia nuovo quiz (usata anche per restart)
  function startQuiz() {
    setQuestions(getRandomQuestions(quizData, 80));
    setCurrent(0);
    setAnswers({});
    setStartTime(Date.now());
    setShowResult(false);
    setEndTime(null);
    setPaused(false);
    setElapsed(0);
    setShowLiveStats(false);
  }

  useEffect(() => {
    startQuiz();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (showResult || paused) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev + 1 >= MAX_TIME_SECONDS) {
          clearInterval(timerRef.current);
          setEndTime(Date.now());
          setShowResult(true);
          return MAX_TIME_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [showResult, paused]);

  function currentKey() {
    return questions.length ? questions[current].id : "";
  }

  function handleMultiAnswer(idx) {
    const key = currentKey();
    const prev = Array.isArray(answers[key]) ? answers[key] : [];
    let newVal;
    if (prev.includes(idx)) {
      newVal = prev.filter(i => i !== idx);
    } else {
      newVal = [...prev, idx];
    }
    setAnswers({ ...answers, [key]: newVal });
  }

  function nextQuestion() {
    if (current + 1 === questions.length) {
      setEndTime(Date.now());
      setShowResult(true);
    } else {
      setCurrent(current + 1);
    }
  }

  function isCorrectFor(q, userAns) {
    const ua = Array.isArray(userAns) ? userAns : [];
    const ca = Array.isArray(q.answer) ? q.answer : [];
    return JSON.stringify(ca.slice().sort()) === JSON.stringify(ua.slice().sort());
  }

  function getScore() {
    let score = 0;
    questions.forEach((q) => {
      const userAns = answers[q.id] || [];
      if (isCorrectFor(q, userAns)) score++;
    });
    return score;
  }

  function getMistakes() {
    return questions
      .map(q => {
        const userAns = answers[q.id] || [];
        const correct = Array.isArray(q.answer) ? q.answer : [q.answer];
        const isCorrect = isCorrectFor(q, userAns);
        if (!isCorrect) {
          return {
            id: q.id,
            question: q.question,
            options: q.options,
            correct,
            user: Array.isArray(userAns) ? userAns : [userAns]
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  function getAnsweredCount() {
    let count = 0;
    for (const q of questions) {
      const a = answers[q.id];
      if (Array.isArray(a) && a.length > 0) count++;
    }
    return count;
  }

  function getLiveScore() {
    let correct = 0;
    let answered = 0;
    for (const q of questions) {
      const ua = answers[q.id];
      if (Array.isArray(ua) && ua.length > 0) {
        answered++;
        if (isCorrectFor(q, ua)) correct++;
      }
    }
    return { correct, answered };
  }

  function prettyTime(s) {
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  }

  // --- UI ---
  if (!questions.length) return <div className="loader">Caricamento domande…</div>;

  if (showResult) {
    const score = getScore();
    const mistakes = getMistakes();
    return (
      <div className="result-container">
        <h2 style={{ color: "#1976D2" }}>Quiz completato!</h2>
        <div className="score-bar">
          <span className="badge">{score}/{questions.length}</span>
          <span style={{ marginLeft: 8 }}>
            {((score / questions.length) * 100).toFixed(1)}%
          </span>
          <span className={`status-badge ${score >= 68 ? 'pass' : 'fail'}`}>
            {score >= 68 ? "PROMOSSO" : "NON SUPERATO"}
          </span>
        </div>
        <div className="time-bar">
          <strong>Tempo totale:</strong> {prettyTime(Math.min(elapsed, MAX_TIME_SECONDS))}
        </div>
        <button className="restart-btn" onClick={startQuiz}>Nuovo Esame</button>
        <h3 style={{ marginTop: 20, color: "#CA5604" }}>Correzioni delle domande sbagliate:</h3>
        {mistakes.length === 0 ? (
          <div className="no-mistakes">Non hai sbagliato nessuna domanda!</div>
        ) : (
          <ul className="mistake-list">
            {mistakes.map((m, idx) => (
              <li key={idx} className="mistake-item">
                <div>
                  <span className="id-badge">ID {m.id}</span>
                  <strong style={{ marginLeft: 8 }}>{m.question}</strong>
                </div>
                <div>
                  <span style={{ color: "#B71C1C" }}>
                    Le tue risposte: {m.user.map(i => m.options[i]).join(', ') || "Nessuna"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#388E3C" }}>
                    Corretto: {m.correct.map(i => m.options[i]).join(', ')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const q = questions[current];
  const answerKey = currentKey();

  // statistiche live
  const total = questions.length;
  const answeredCount = getAnsweredCount();
  const progressPct = total > 0 ? ((answeredCount / total) * 100).toFixed(1) : "0.0";
  const { correct, answered } = getLiveScore();
  const passPct = answered > 0 ? ((correct / answered) * 100).toFixed(1) : "0.0";

  // stima minima/massima a fine quiz se mantieni lo stesso ritmo
  // minimo = mantieni la stessa accuracy sulle restanti (ipotizzandole tutte sbagliate è troppo pessimista)
  // qui facciamo due indicatori utili:
  // - Proiezione lineare: accuracy_attuale * totale
  // - Best case ragionevole: corrette attuali + tutte le restanti corrette (indicativo)
  const projectedFinalCorrect = answered > 0 ? Math.round((correct / answered) * total) : 0;
  const bestCaseFinalCorrect = correct + (total - answered); // tutte le restanti giuste
  const needFor68 = Math.max(0, Math.ceil(0.68 * total) - correct); // quante corrette ti mancano per arrivare al 68% sul totale

  return (
    <div className="quiz-main">
      <h1 className="app-title">Scrum Master Exam v.19<span role="img" aria-label="scrum">📝</span></h1>

      <div className="question-progress">
        <span className="badge">Domanda {current + 1} / {questions.length}</span>
        <span className="id-badge">ID {q.id}</span>
      </div>

      <div className="question-text">
        <strong>{q.question}</strong>
      </div>

      <div className="timer-block">
        <span><strong>Timer:</strong> {prettyTime(elapsed)} / 60:00</span>
        {paused ? (
          <button className="pause-btn" onClick={() => setPaused(false)}>Riprendi Timer</button>
        ) : (
          <button className="pause-btn" onClick={() => setPaused(true)}>Pausa Timer</button>
        )}
        <button
          className="live-stats-btn"
          onClick={() => setShowLiveStats(v => !v)}
          disabled={paused}
          title="Mostra percentuali di avanzamento e superamento"
        >
          {showLiveStats ? "Nascondi percentuale" : "Mostra percentuale"}
        </button>
      </div>

      {showLiveStats && (
        <div className="live-stats-panel">
          <div className="live-stat-row">
            <span className="live-label">Avanzamento:</span>
            <span className="live-value">
              {answeredCount}/{total} ({progressPct}%)
            </span>
          </div>
          <div className="live-stat-row">
            <span className="live-label">Percentuale di superamento (finora):</span>
            <span className="live-value success">
              {answered > 0 ? `${correct}/${answered} (${passPct}%)` : "N.D."}
            </span>
          </div>
          <div className="live-stat-row">
            <span className="live-label">Proiezione finale (lineare):</span>
            <span className="live-value">
              {answered > 0 ? `${projectedFinalCorrect}/${total} (${((projectedFinalCorrect / total) * 100).toFixed(1)}%)` : "N.D."}
            </span>
          </div>
          <div className="live-stat-row">
            <span className="live-label">Best case (indicativo):</span>
            <span className="live-value">
              {`${bestCaseFinalCorrect}/${total} (${((bestCaseFinalCorrect / total) * 100).toFixed(1)}%)`}
            </span>
          </div>
          <div className="live-hint">
            Per arrivare al 68% sul totale servono ancora: <strong>{needFor68}</strong> risposte corrette.
          </div>
        </div>
      )}

      <ul className="option-list">
        {q.options.map((option, idx) => (
          <li
            key={idx}
            className={`option-item${Array.isArray(answers[answerKey]) && answers[answerKey].includes(idx) ? ' selected' : ''}`}
          >
            <label>
              <input
                type="checkbox"
                checked={Array.isArray(answers[answerKey]) ? answers[answerKey].includes(idx) : false}
                onChange={() => handleMultiAnswer(idx)}
                disabled={paused}
              />
              {option}
            </label>
          </li>
        ))}
      </ul>

      <button
        className="next-btn"
        onClick={nextQuestion}
        disabled={paused || !answers[answerKey] || answers[answerKey].length === 0}
      >
        {current + 1 === questions.length ? "Termina e mostra risultato" : "Prossima domanda"}
      </button>

      {elapsed >= MAX_TIME_SECONDS && (
        <div className="timeout-alert">Tempo scaduto! Quiz terminato automaticamente.</div>
      )}

      <style>{`
        .app-title { color: #1976D2; text-align: center; margin-bottom: 10px; }
        .quiz-main { padding: 24px 12px; max-width: 510px; margin: 32px auto; background: #f7faff; border-radius: 12px; border: 1px solid #e8eaf6; box-shadow: 0 2px 12px #e0e0e0; }
        .question-progress { display: flex; gap: 16px; align-items: center; margin-bottom: 6px; }
        .badge { background: #FFC107; color: #444; font-weight: 700; border-radius: 15px; padding: 3px 11px; }
        .id-badge { background: #d0e7fa; color: #2269ad; font-size: 11px; border-radius: 10px; padding: 2px 7px; letter-spacing: 1px; margin-left: 3px;}
        .question-text { font-size: 1.09em; margin-bottom: 18px; }
        .timer-block { margin-bottom: 16px; display: flex; gap: 12px; align-items: center;}
        .pause-btn { padding: 4px 18px; border-radius: 7px; border: none; background: #e3f2fd; color: #0d47a1; cursor: pointer; font-weight: 500; box-shadow: 0 1px 4px #e0e0e0;}
        .live-stats-btn { padding: 4px 12px; border-radius: 7px; border: none; background: #e8f5e9; color: #1b5e20; cursor: pointer; font-weight: 600; box-shadow: 0 1px 4px #e0e0e0; }
        .option-list { list-style: none; padding: 0; margin-bottom: 22px;}
        .option-item { margin: 7px 0; padding: 6px 8px; background: #fff; border-radius: 8px; transition: background 0.2s;}
        .option-item.selected { background: #BBDEFB; }
        .next-btn { background: #2196F3; color: #fff; border: none; padding: 8px 21px; border-radius: 7px; font-size: 1em; cursor: pointer; font-weight: 600; box-shadow: 0 1px 4px #e0e0e0;}
        .next-btn:disabled { background: #b6c6d6; cursor: not-allowed;}
        .timeout-alert { color: #B71C1C; font-weight: 700; margin-top: 20px;}

        .result-container { max-width: 590px; margin: 34px auto; background: #fffde7; border-radius: 18px; box-shadow: 0 3px 14px #FFECB3; padding: 32px 16px;}
        .score-bar, .time-bar { display: flex; align-items: center; gap: 18px; font-size: 1.14em; margin-bottom: 10px;}
        .status-badge.pass { background: #C8E6C9; color: #2e7d32; font-weight: 700; border-radius: 14px; padding: 4px 16px;}
        .status-badge.fail { background: #FFCDD2; color: #b71c1c; font-weight: 700; border-radius: 14px; padding: 4px 16px;}
        .restart-btn { margin-top: 6px; background: #FFA726; color: #212121; font-weight: 700; border-radius: 10px; border: none; padding: 8px 21px; cursor: pointer;}
        .mistake-list { margin-top: 14px; padding-left: 0;}
        .mistake-item { background: #FFEBEE; border-radius: 7px; padding: 10px 8px; margin-bottom: 11px; box-shadow: 0 1px 6px #f8bbd0;}
        .no-mistakes { color: #2e7d32; font-weight: 600; font-size: 1.07em;}

        .live-stats-panel { margin: 10px 0 14px 0; background: #f1f8e9; border: 1px solid #c5e1a5; border-radius: 10px; padding: 10px 12px; }
        .live-stat-row { display: flex; justify-content: space-between; align-items: center; margin: 4px 0; }
        .live-label { font-weight: 600; color: #33691e; }
        .live-value { font-weight: 700; color: #2e7d32; }
        .live-value.success { color: #1b5e20; }
        .live-hint { margin-top: 6px; font-size: 0.9em; color: #5d6d5f; }
      `}</style>
    </div>
  );
}
