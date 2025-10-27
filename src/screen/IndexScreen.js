import FooterSignature from '../FooterSignature';

export default function IndexScreen({ onSelectFile }) {
  return (
    <div className="quiz-main home-screen">
      <h1 className="home-title">
        <span role="img" aria-label="scrum">📝</span> Scrum Master Practice Exam <span className="version"></span>
      </h1>
      <div className="home-desc">Scegli quale quiz vuoi simulare:</div>
      <div className="home-options">
        <button className="select-btn psm1 big" onClick={() => onSelectFile("psm1")}>
          <span role="img" aria-label="psm1">📋</span> Quiz sulla Scrum Guide
          <div className="quiz-type-desc">80 domande, simulazione reale — 85% per passare</div>
        </button>
        <button className="select-btn glossario big" onClick={() => onSelectFile("glossario")}>
          <span role="img" aria-label="glossario">📚</span> Quiz Glossario
          <div className="quiz-type-desc">Domande extra su termini e definizioni — 90% per passare</div>
        </button>
      </div>
      <FooterSignature />
    </div>
  );
}
