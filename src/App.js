import React, { useEffect, useState, useRef } from "react";

// Import dei due JSON
import quizDataPSM1 from "./data/quiz.json";
import quizDataGlossario from "./data/newQuizGlossario.json";

const PSM1_PERCENTAGE = {
  "Scrum Framework": 20,
  "Artefatti Scrum": 10,
  "Ruoli Scrum": 20,
  "Eventi Scrum": 15,
  "Valori Scrum": 10,
  "Scaling Scrum": 5,
  "Adattamento Organizzativo": 5,
  "Ispezione e Adattamento": 5,
};

const MAX_TIME_SECONDS = 60 * 60; // 1 ora
const QUIZ_SIZE = 80;

// Utility: crea le 80 domande bilanciate per il quiz PSM1
function getRandomPSM1Quiz(allQuestions, quizSize = QUIZ_SIZE) {
  const domainQuestions = {};
  for (const q of allQuestions) {
    const dom = q.dominioAppartenenza || "Senza Dominio";
    domainQuestions[dom] ??= [];
    domainQuestions[dom].push(q);
  }

  const selected = [];
  const usedIds = new Set();

  for (const [dominio, perc] of Object.entries(PSM1_PERCENTAGE)) {
    const pool = domainQuestions[dominio] || [];
    const ask = Math.round((quizSize * perc) / 100);
    const uniquePool = pool.filter(q => !usedIds.has(q.id));
    const toPick = Math.min(uniquePool.length, ask);
    const sample = shuffle(uniquePool).slice(0, toPick);
    for (const q of sample) usedIds.add(q.id);
    selected.push(...sample);
  }

  if (selected.length < quizSize) {
    const allRemaining = Object.values(domainQuestions).flat().filter(q => !usedIds.has(q.id));
    const extra = shuffle(allRemaining).slice(0, quizSize - selected.length);
    for (const q of extra) usedIds.add(q.id);
    selected.push(...extra);
  }

  return shuffle(selected.slice(0, quizSize));
}

// Fisher-Yates Shuffle
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- UI/REACT LOGIC ---
export default function App() {
  // Stati per la configurazione pre-quiz
  const [selectedFile, setSelectedFile] = useState(null); // "psm1" o "glossario"
  const [selectedMode, setSelectedMode] = useState(null); // "exam" o "practice"
  const [quizStarted, setQuizStarted] = useState(false);

  // Stati per il quiz
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showLiveStats, setShowLiveStats] = useState(false);
  const timerRef = useRef();

  function startQuiz() {
    // Carica il file selezionato
    const sourceData = selectedFile === "psm1" ? quizDataPSM1 : quizDataGlossario;
    let selectedQuestions;

    if (selectedMode === "practice") {
      // Modalità allenamento: tutte le domande
      selectedQuestions = shuffle(sourceData);
    } else {
      // Modalità esame: 80 domande bilanciate
      selectedQuestions = getRandomPSM1Quiz(sourceData, QUIZ_SIZE);
    }

    setQuestions(selectedQuestions);
    setCurrent(0);
    setAnswers({});
    setStartTime(Date.now());
    setShowResult(false);
    setEndTime(null);
    setPaused(false);
    setElapsed(0);
    setShowLiveStats(false);
    setQuizStarted(true);
  }

  function resetToSelection() {
    setSelectedFile(null);
    setSelectedMode(null);
    setQuizStarted(false);
    setQuestions([]);
    setCurrent(0);
    setAnswers({});
    setShowResult(false);
    setElapsed(0);
  }

  useEffect(() => {
    if (!quizStarted || showResult || paused || selectedMode === "practice") {
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
  }, [quizStarted, showResult, paused, selectedMode]);

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

  function getPassThreshold() {
    return Math.ceil(questions.length * 0.90);
  }

  // --- RENDER SCHERMATA INIZIALE (STEP 1: Selezione File) ---
  if (!selectedFile) {
    return (
      <div className="quiz-main">
        <h1 className="app-title">Scrum Master Practice Exam v.40<span role="img" aria-label="scrum">📝</span></h1>
        <div className="selection-container">
          <h2 style={{ color: "#1976D2", textAlign: "center", marginBottom: 24 }}>Step 1: Seleziona il file del quiz</h2>
          <div className="button-group-vertical">
            <button className="select-btn psm1" onClick={() => setSelectedFile("psm1")}>
              📋 Quiz PSM1
            </button>
            <button className="select-btn glossario" onClick={() => setSelectedFile("glossario")}>
              📚 Quiz Glossario
            </button>
          </div>
        </div>
        <style>{`
          .selection-container { max-width: 520px; margin: 0 auto; }
          .button-group-vertical { display: flex; flex-direction: column; gap: 16px; max-width: 320px; margin: 0 auto; }
          .select-btn { padding: 20px 32px; border: none; border-radius: 12px; font-size: 1.2em; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s; }
          .select-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
          .select-btn.psm1 { background: #2196F3; color: #fff; }
          .select-btn.glossario { background: #FFA726; color: #212121; }
          .select-btn.exam { background: #FF5722; color: #fff; }
          .select-btn.practice { background: #66BB6A; color: #fff; }
          .select-btn.start { background: #9C27B0; color: #fff; font-size: 1.3em; padding: 24px 40px; }
          .app-title { color: #1976D2; text-align: center; margin-bottom: 32px; font-size: 1.8em; }
          .quiz-main { padding: 24px 12px; max-width: 650px; margin: 32px auto; background: #f7faff; border-radius: 12px; border: 1px solid #e8eaf6; box-shadow: 0 2px 12px #e0e0e0; }
          .selection-info { background: #E8F5E9; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .selection-info strong { color: #2e7d32; }
          .back-btn { background: #9E9E9E; color: #fff; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; margin-top: 16px; font-weight: 600; }
          .back-btn:hover { background: #757575; }
        `}</style>
      </div>
    );
  }

  // --- RENDER SCHERMATA SELEZIONE MODALITÀ (STEP 2: Selezione Modalità) ---
  if (!selectedMode) {
    return (
      <div className="quiz-main">
        <h1 className="app-title">Scrum Master Practice Exam <span role="img" aria-label="scrum">📝</span></h1>
        <div className="selection-container">
          <div className="selection-info">
            <strong>File selezionato:</strong> {selectedFile === "psm1" ? "Quiz PSM1" : "Quiz Glossario"}
          </div>
          <h2 style={{ color: "#1976D2", textAlign: "center", marginBottom: 24 }}>Step 2: Seleziona la modalità</h2>
          <div className="button-group-vertical">
            <button className="select-btn exam" onClick={() => setSelectedMode("exam")}>
              ⏱️ Modalità Esame<br/>
              <span style={{fontSize: '0.8em', fontWeight: 400}}>(80 domande, 60 minuti, 90% per passare)</span>
            </button>
            <button className="select-btn practice" onClick={() => setSelectedMode("practice")}>
              💪 Modalità Allenamento<br/>
              <span style={{fontSize: '0.8em', fontWeight: 400}}>(Tutte le domande, senza timer, 90% per passare)</span>
            </button>
          </div>
          <button className="back-btn" onClick={() => setSelectedFile(null)}>← Indietro</button>
        </div>
        <style>{`
          .selection-container { max-width: 520px; margin: 0 auto; }
          .button-group-vertical { display: flex; flex-direction: column; gap: 16px; max-width: 380px; margin: 0 auto; }
          .select-btn { padding: 20px 32px; border: none; border-radius: 12px; font-size: 1.2em; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s; line-height: 1.6; }
          .select-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
          .select-btn.psm1 { background: #2196F3; color: #fff; }
          .select-btn.glossario { background: #FFA726; color: #212121; }
          .select-btn.exam { background: #FF5722; color: #fff; }
          .select-btn.practice { background: #66BB6A; color: #fff; }
          .select-btn.start { background: #9C27B0; color: #fff; font-size: 1.3em; padding: 24px 40px; }
          .app-title { color: #1976D2; text-align: center; margin-bottom: 32px; font-size: 1.8em; }
          .quiz-main { padding: 24px 12px; max-width: 650px; margin: 32px auto; background: #f7faff; border-radius: 12px; border: 1px solid #e8eaf6; box-shadow: 0 2px 12px #e0e0e0; }
          .selection-info { background: #E8F5E9; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .selection-info strong { color: #2e7d32; }
          .back-btn { background: #9E9E9E; color: #fff; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; margin-top: 16px; font-weight: 600; display: block; margin-left: auto; margin-right: auto; }
          .back-btn:hover { background: #757575; }
        `}</style>
      </div>
    );
  }

  // --- RENDER SCHERMATA CONFERMA (STEP 3: Conferma e Start) ---
  if (!quizStarted) {
    return (
      <div className="quiz-main">
        <h1 className="app-title">Scrum Master Practice Exam <span role="img" aria-label="scrum">📝</span></h1>
        <div className="selection-container">
          <h2 style={{ color: "#1976D2", textAlign: "center", marginBottom: 24 }}>Step 3: Conferma e avvia il quiz</h2>
          <div className="selection-info">
            <div style={{marginBottom: 8}}><strong>File:</strong> {selectedFile === "psm1" ? "Quiz PSM1" : "Quiz Glossario"}</div>
            <div><strong>Modalità:</strong> {selectedMode === "exam" ? "Esame (80 domande, 60 min)" : "Allenamento (tutte le domande, senza timer)"}</div>
          </div>
          <div className="button-group-vertical">
            <button className="select-btn start" onClick={startQuiz}>
              🚀 AVVIA QUIZ
            </button>
          </div>
          <button className="back-btn" onClick={() => setSelectedMode(null)}>← Indietro</button>
        </div>
        <style>{`
          .selection-container { max-width: 520px; margin: 0 auto; }
          .button-group-vertical { display: flex; flex-direction: column; gap: 16px; max-width: 380px; margin: 0 auto; }
          .select-btn { padding: 20px 32px; border: none; border-radius: 12px; font-size: 1.2em; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s; line-height: 1.6; }
          .select-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
          .select-btn.psm1 { background: #2196F3; color: #fff; }
          .select-btn.glossario { background: #FFA726; color: #212121; }
          .select-btn.exam { background: #FF5722; color: #fff; }
          .select-btn.practice { background: #66BB6A; color: #fff; }
          .select-btn.start { background: #9C27B0; color: #fff; font-size: 1.3em; padding: 24px 40px; }
          .app-title { color: #1976D2; text-align: center; margin-bottom: 32px; font-size: 1.8em; }
          .quiz-main { padding: 24px 12px; max-width: 650px; margin: 32px auto; background: #f7faff; border-radius: 12px; border: 1px solid #e8eaf6; box-shadow: 0 2px 12px #e0e0e0; }
          .selection-info { background: #E8F5E9; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center; font-size: 1.05em; }
          .selection-info strong { color: #2e7d32; }
          .back-btn { background: #9E9E9E; color: #fff; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; margin-top: 16px; font-weight: 600; display: block; margin-left: auto; margin-right: auto; }
          .back-btn:hover { background: #757575; }
        `}</style>
      </div>
    );
  }

  // --- RENDER RISULTATO ---
  if (showResult) {
    const score = getScore();
    const mistakes = getMistakes();
    const passThreshold = getPassThreshold();
    const passPercentage = ((passThreshold / questions.length) * 100).toFixed(0);
    const isPassed = score >= passThreshold;

    return (
      <div className="result-container">
        <h2 style={{ color: "#1976D2" }}>Quiz completato!</h2>
        <div className="quiz-info-result">
          <span className="info-badge">{selectedFile === "psm1" ? "PSM1" : "Glossario"}</span>
          <span className="info-badge">{selectedMode === "exam" ? "Modalità Esame" : "Modalità Allenamento"}</span>
        </div>
        <div className="score-bar">
          <span className="badge">{score}/{questions.length}</span>
          <span style={{ marginLeft: 8 }}>
            {((score / questions.length) * 100).toFixed(1)}%
          </span>
          <span className={`status-badge ${isPassed ? 'pass' : 'fail'}`}>
            {isPassed ? "PROMOSSO ✓" : "NON SUPERATO ✗"}
          </span>
          <span style={{ fontSize: '0.9em', color: '#666', marginLeft: 8 }}>
            (Richiesto: {passThreshold}/{questions.length} = {passPercentage}%)
          </span>
        </div>
        {selectedMode === "exam" && (
          <div className="time-bar">
            <strong>Tempo totale:</strong> {prettyTime(Math.min(elapsed, MAX_TIME_SECONDS))}
          </div>
        )}
        <button className="restart-btn" onClick={resetToSelection}>Torna alla selezione</button>
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
        <style>{`
          .result-container { max-width: 590px; margin: 34px auto; background: #fffde7; border-radius: 18px; box-shadow: 0 3px 14px #FFECB3; padding: 32px 16px;}
          .quiz-info-result { display: flex; gap: 10px; justify-content: center; margin-bottom: 16px; }
          .info-badge { background: #E3F2FD; color: #1565C0; font-size: 0.85em; font-weight: 600; border-radius: 12px; padding: 4px 12px; border: 1px solid #90CAF9; }
          .score-bar, .time-bar { display: flex; align-items: center; gap: 18px; font-size: 1.14em; margin-bottom: 10px; flex-wrap: wrap;}
          .badge { background: #FFC107; color: #444; font-weight: 700; border-radius: 15px; padding: 3px 11px; }
          .status-badge.pass { background: #C8E6C9; color: #2e7d32; font-weight: 700; border-radius: 14px; padding: 4px 16px;}
          .status-badge.fail { background: #FFCDD2; color: #b71c1c; font-weight: 700; border-radius: 14px; padding: 4px 16px;}
          .restart-btn { margin-top: 6px; background: #FFA726; color: #212121; font-weight: 700; border-radius: 10px; border: none; padding: 8px 21px; cursor: pointer;}
          .restart-btn:hover { background: #FB8C00; }
          .mistake-list { margin-top: 14px; padding-left: 0; list-style: none;}
          .mistake-item { background: #FFEBEE; border-radius: 7px; padding: 10px 8px; margin-bottom: 11px; box-shadow: 0 1px 6px #f8bbd0;}
          .id-badge { background: #d0e7fa; color: #2269ad; font-size: 11px; border-radius: 10px; padding: 2px 7px; letter-spacing: 1px;}
          .no-mistakes { color: #2e7d32; font-weight: 600; font-size: 1.07em;}
        `}</style>
      </div>
    );
  }

  // --- RENDER QUIZ ---
  if (!questions.length) return <div className="loader">Caricamento domande…</div>;

  const q = questions[current];
  const answerKey = currentKey();
  const total = questions.length;
  const answeredCount = getAnsweredCount();
  const progressPct = total > 0 ? ((answeredCount / total) * 100).toFixed(1) : "0.0";
  const { correct, answered } = getLiveScore();
  const passPct = answered > 0 ? ((correct / answered) * 100).toFixed(1) : "0.0";
  const projectedFinalCorrect = answered > 0 ? Math.round((correct / answered) * total) : 0;
  const bestCaseFinalCorrect = correct + (total - answered);
  const passThreshold = getPassThreshold();
  const needForPass = Math.max(0, passThreshold - correct);

  return (
    <div className="quiz-main">
      <h1 className="app-title">
        {selectedFile === "psm1" ? "Scrum Master PSM1 Practice Exam" : "Quiz Glossario Scrum"} 
        <span role="img" aria-label="scrum">📝</span>
      </h1>
      <div className="exam-info">
        <span className="info-badge">{questions.length} domande</span>
        {selectedMode === "exam" && <span className="info-badge">60 minuti</span>}
        <span className="info-badge">{selectedMode === "exam" ? "Modalità Esame" : "Modalità Allenamento"}</span>
        <span className="info-badge">90% per superare</span>
      </div>
      <div className="question-progress">
        <span className="badge">Domanda {current + 1} / {questions.length}</span>
        <span className="id-badge">ID {q.id}</span>
      </div>
      <div className="question-text">
        <strong>{q.question}</strong>
      </div>
      {selectedMode === "exam" && (
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
      )}
      {selectedMode === "practice" && (
        <div className="timer-block">
          <button
            className="live-stats-btn"
            onClick={() => setShowLiveStats(v => !v)}
            title="Mostra statistiche di avanzamento"
          >
            {showLiveStats ? "Nascondi statistiche" : "Mostra statistiche"}
          </button>
        </div>
      )}
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
            Per superare servono <strong>{passThreshold} risposte corrette (90%)</strong>. Te ne mancano ancora: <strong>{needForPass}</strong>
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
                disabled={selectedMode === "exam" && paused}
              />
              {option}
            </label>
          </li>
        ))}
      </ul>

      <button
        className="next-btn"
        onClick={nextQuestion}
        disabled={(selectedMode === "exam" && paused) || !answers[answerKey] || answers[answerKey].length === 0}
      >
        {current + 1 === questions.length ? "Termina e mostra risultato" : "Prossima domanda"}
      </button>
      {selectedMode === "exam" && elapsed >= MAX_TIME_SECONDS && (
        <div className="timeout-alert">Tempo scaduto! Quiz terminato automaticamente.</div>
      )}
      <style>{`
        .app-title { color: #1976D2; text-align: center; margin-bottom: 8px; font-size: 1.5em; }
        .exam-info { display: flex; gap: 10px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
        .info-badge { background: #E3F2FD; color: #1565C0; font-size: 0.85em; font-weight: 600; border-radius: 12px; padding: 4px 12px; border: 1px solid #90CAF9; }
        .quiz-main { padding: 24px 12px; max-width: 510px; margin: 32px auto; background: #f7faff; border-radius: 12px; border: 1px solid #e8eaf6; box-shadow: 0 2px 12px #e0e0e0; }
        .question-progress { display: flex; gap: 16px; align-items: center; margin-bottom: 6px; }
        .badge { background: #FFC107; color: #444; font-weight: 700; border-radius: 15px; padding: 3px 11px; }
        .id-badge { background: #d0e7fa; color: #2269ad; font-size: 11px; border-radius: 10px; padding: 2px 7px; letter-spacing: 1px; margin-left: 3px;}
        .question-text { font-size: 1.09em; margin-bottom: 18px; }
        .timer-block { margin-bottom: 16px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;}
        .pause-btn { padding: 4px 18px; border-radius: 7px; border: none; background: #e3f2fd; color: #0d47a1; cursor: pointer; font-weight: 500; box-shadow: 0 1px 4px #e0e0e0;}
        .pause-btn:hover { background: #bbdefb; }
        .live-stats-btn { padding: 4px 12px; border-radius: 7px; border: none; background: #e8f5e9; color: #1b5e20; cursor: pointer; font-weight: 600; box-shadow: 0 1px 4px #e0e0e0; }
        .live-stats-btn:hover { background: #c8e6c9; }
        .live-stats-btn:disabled { background: #f5f5f5; color: #9e9e9e; cursor: not-allowed; }
        .option-list { list-style: none; padding: 0; margin-bottom: 22px;}
        .option-item { margin: 7px 0; padding: 6px 8px; background: #fff; border-radius: 8px; transition: background 0.2s; cursor: pointer;}
        .option-item:hover { background: #E3F2FD; }
        .option-item.selected { background: #BBDEFB; }
        .option-item label { cursor: pointer; display: flex; align-items: flex-start; gap: 8px; }
        .option-item input[type="checkbox"] { margin-top: 4px; cursor: pointer; }
        .next-btn { background: #2196F3; color: #fff; border: none; padding: 8px 21px; border-radius: 7px; font-size: 1em; cursor: pointer; font-weight: 600; box-shadow: 0 1px 4px #e0e0e0;}
        .next-btn:hover { background: #1976D2; }
        .next-btn:disabled { background: #b6c6d6; cursor: not-allowed;}
        .timeout-alert { color: #B71C1C; font-weight: 700; margin-top: 20px;}
        .live-stats-panel { margin: 10px 0 14px 0; background: #f1f8e9; border: 1px solid #c5e1a5; border-radius: 10px; padding: 10px 12px; }
        .live-stat-row { display: flex; justify-content: space-between; align-items: center; margin: 4px 0; }
        .live-label { font-weight: 600; color: #33691e; }
        .live-value { font-weight: 700; color: #2e7d32; }
        .live-value.success { color: #1b5e20; }
        .live-hint { margin-top: 6px; font-size: 0.9em; color: #5d6d5f; }
        .loader { text-align: center; padding: 40px; font-size: 1.2em; color: #1976D2; }
      `}</style>
    </div>
  );
}
