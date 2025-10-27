import React from "react";
import FooterSignature from "../FooterSignature";

export default function QuizScreen({
  questions, current, setCurrent, answers, setAnswers,
  selectedMode, paused, setPaused, elapsed,
  setShowResult, showLiveStats, setShowLiveStats
}) {
  if (!questions.length) return <div className="loader">Caricamento domande…</div>;
  const q = questions[current];
  const total = questions.length;
  const answerKey = q.id;

  function handleMultiAnswer(idx) {
    const prev = Array.isArray(answers[answerKey]) ? answers[answerKey] : [];
    let newVal;
    if (prev.includes(idx)) newVal = prev.filter(i => i !== idx);
    else newVal = [...prev, idx];
    setAnswers({ ...answers, [answerKey]: newVal });
  }
  function nextQuestion() {
    if (current + 1 >= questions.length) setShowResult(true);
    else setCurrent(current + 1);
  }
  function prettyTime(s) {
    const mm = Math.floor(s / 60); const ss = s % 60;
    return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  }
  function getAnsweredCount() {
    let count = 0;
    for (const qq of questions) {
      const a = answers[qq.id];
      if (Array.isArray(a) && a.length > 0) count++;
    }
    return count;
  }
  function isCorrectFor(q, userAns) {
    const ua = Array.isArray(userAns) ? userAns : [];
    const ca = Array.isArray(q.answer) ? q.answer : [];
    return JSON.stringify(ca.slice().sort()) === JSON.stringify(ua.slice().sort());
  }
  function getLiveScore() {
    let correct = 0; let answered = 0;
    for (const qq of questions) {
      const ua = answers[qq.id];
      if (Array.isArray(ua) && ua.length > 0) {
        answered++;
        if (isCorrectFor(qq, ua)) correct++;
      }
    }
    return { correct, answered };
  }
  const { correct, answered } = getLiveScore();
  const passThreshold = Math.ceil(total * 0.9);
  const progressPct = total > 0 ? ((getAnsweredCount() / total) * 100).toFixed(1) : "0.0";
  const passPct = answered > 0 ? ((correct / answered) * 100).toFixed(1) : "0.0";
  const projectedFinalCorrect = answered > 0 ? Math.round((correct / answered) * total) : 0;
  const bestCaseFinalCorrect = correct + (total - answered);
  const needForPass = Math.max(0, passThreshold - correct);

  return (
    <div className="quiz-main">
      <div className="quiz-headline">
        <h1 className="app-title">Quiz Scrum <span role="img" aria-label="scrum">📝</span></h1>
        <div className="mode-info-badge">
          {selectedMode === "exam"
            ? <span className="esame-badge">Simulazione Esame Reale</span>
            : <span className="allenamento-badge">Modalità Allenamento</span>
          }
        </div>
        {selectedMode === "exam" &&
          <div className="timer-block">
            <span className="timer-label">
              <span className="stopwatch" role="img" aria-label="timer">⏱️</span>
              <strong>{prettyTime(elapsed)} / 60:00</strong>
            </span>
            <button className="pause-btn" onClick={() => setPaused(p => !p)}>
              {paused ? "Riprendi Timer" : "Pausa Timer"}
            </button>
            <button className="live-stats-btn" onClick={() => setShowLiveStats(v => !v)}>
              {showLiveStats ? "Nascondi percentuale" : "Visualizza percentuale avanzamento"}
            </button>
          </div>
        }
      </div>

      <div className="question-progress">
        <span className="badge">Domanda {current + 1} / {total}</span>
      </div>
      <div className="question-text"><strong>{q.question}</strong></div>
      <ul className="option-list">
        {q.options.map((option, idx) => (
          <li key={idx}
              className={`option-item${Array.isArray(answers[answerKey]) && answers[answerKey].includes(idx) ? ' selected' : ''}`}>
            <label>
              <input type="checkbox"
                     checked={Array.isArray(answers[answerKey]) ? answers[answerKey].includes(idx) : false}
                     onChange={() => handleMultiAnswer(idx)}
                     disabled={selectedMode === "exam" && paused}
              />
              {option}
            </label>
          </li>
        ))}
      </ul>
      <button className="next-btn"
              onClick={nextQuestion}
              disabled={(selectedMode === "exam" && paused) || !answers[answerKey] || answers[answerKey].length === 0}>
        {current + 1 === total ? "Termina e mostra risultato" : "Prossima domanda"}
      </button>
      {showLiveStats && (
        <div className="live-stats-panel">
          <div className="live-stat-row">
            <span className="live-label">Avanzamento:</span>
            <span className="live-value">{getAnsweredCount()}/{total} ({progressPct}%)</span>
          </div>
          <div className="live-stat-row">
            <span className="live-label">Risposte corrette (finora):</span>
            <span className="live-value success">{answered > 0 ? `${correct}/${answered} (${passPct}%)` : "N.D."}</span>
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
            Per superare servono <strong>{passThreshold} risposte corrette ({selectedMode === "exam" ? "85" : "90"}%)</strong>. Te ne mancano ancora: <strong>{needForPass}</strong>
          </div>
        </div>
      )}
      <FooterSignature />
    </div>
  );
}
