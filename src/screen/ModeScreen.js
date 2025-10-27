import FooterSignature from '../FooterSignature';

export default function ModeScreen({ selectedFile, onSelectMode, onBack }) {
  return (
    <div className="quiz-main">
      <h1 className="app-title">Scrum Master Practice Exam <span role="img" aria-label="scrum">📝</span></h1>
      <div className="selection-container">
        <div className="selection-info">
          <strong>File selezionato:</strong> {selectedFile === "psm1" ? "Quiz PSM1" : "Quiz Glossario"}
        </div>
        <h2 className="section-title">Step 2: Seleziona la modalità</h2>
        <div className="button-group-vertical">
          <button className="select-btn exam" onClick={() => onSelectMode("exam")}>
            ⏱️ Modalità Esame<br />
            <span className="select-btn-desc">(80 domande, 60 minuti, 90% per passare)</span>
          </button>
          <button className="select-btn practice" onClick={() => onSelectMode("practice")}>
            💪 Modalità Allenamento<br />
            <span className="select-btn-desc">(Tutte le domande, senza timer, 90% per passare)</span>
          </button>
        </div>
        <button className="back-btn" onClick={onBack}>← Indietro</button>
      </div>
      <FooterSignature />
    </div>
  );
}
