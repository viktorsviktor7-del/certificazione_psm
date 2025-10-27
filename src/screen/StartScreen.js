import FooterSignature from '../FooterSignature';

export default function StartScreen({ selectedFile, selectedMode, startQuiz, onBack }) {
  return (
    <div className="quiz-main">
      <h1 className="app-title">Scrum Master Practice Exam <span role="img" aria-label="scrum">📝</span></h1>
      <div className="selection-container">
        <h2 className="section-title">Step 3: Conferma e avvia il quiz</h2>
        <div className="selection-info">
          <div><strong>File:</strong> {selectedFile === "psm1" ? "Quiz PSM1" : "Quiz Glossario"}</div>
          <div>
            <strong>Modalità:</strong> {selectedMode === "exam" ? "Esame (80 domande, 60 min)" : "Allenamento (tutte le domande, senza timer)"}
          </div>
        </div>
        <div className="button-group-vertical">
          <button className="select-btn start" onClick={startQuiz}>🚀 AVVIA QUIZ</button>
        </div>
        <button className="back-btn" onClick={onBack}>← Indietro</button>
      </div>
      <FooterSignature />
    </div>
  );
}
