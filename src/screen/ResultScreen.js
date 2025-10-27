import FooterSignature from '../FooterSignature';

function getPassThreshold(mode, numQuestions) {
  return Math.ceil(numQuestions * (mode === "exam" ? 0.85 : 0.90));
}

export default function ResultScreen({ questions, answers, selectedFile, selectedMode, elapsed, resetToSelection }) {
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
  function prettyTime(s) {
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  }

  const score = getScore();
  const mistakes = getMistakes();
  const passThreshold = getPassThreshold(selectedMode, questions.length);
  const passPercent = selectedMode === "exam" ? 85 : 90;
  const isPassed = score >= passThreshold;

  return (
    <div className="result-container">
      <h2 className="main-title">Quiz completato!</h2>
      <div className="score-bar">
        <span className="badge">{score}/{questions.length}</span>
        <span className={`status-badge ${isPassed ? 'pass' : 'fail'}`}>{isPassed ? "PROMOSSO ✓" : "NON SUPERATO ✗"}</span>
        <span className="required-pct">(Richiesto: {passThreshold}/{questions.length} = {passPercent}%)</span>
      </div>
      <div className="quiz-info-result">
        <span className="info-badge">{selectedFile === "psm1" ? "Quiz sulla Scrum Guide" : "Quiz Glossario"}</span>
        <span className="info-badge">{selectedMode === "exam" ? "Simulazione Esame Reale" : "Modalità Allenamento"}</span>
      </div>
      {selectedMode === "exam" && (
        <div className="time-bar"><strong>Tempo totale:</strong> {prettyTime(elapsed)}</div>
      )}
      <button className="restart-btn" onClick={resetToSelection}>Torna alla selezione</button>
      <h3 className="error-section">Correzioni delle domande sbagliate:</h3>
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
                <span className="wrong">Le tue risposte: {m.user.map(i => m.options[i]).join(', ') || "Nessuna"}</span>
              </div>
              <div>
                <span className="right">Corretto: {m.correct.map(i => m.options[i]).join(', ')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <FooterSignature />
    </div>
  );
}
