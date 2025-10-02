import React, { useEffect, useState, useRef } from "react";
import quizData from './data/quiz.json';

const MAX_TIME_SECONDS = 60 * 60; // 60 minuti

function getRandomQuestions(data, n) {
  // Fisher-Yates shuffle
  const arr = [...data];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
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
  }

  // Avvia quiz al primo mount
  useEffect(() => {
    startQuiz();
    // eslint-disable-next-line
  }, []);

  // Timer effect
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

  // Usare la domanda come chiave univoca per risposte
  function currentKey() {
    return questions.length ? questions[current].question : "";
  }

  // Multi-answer selection handler
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

  function getScore() {
    let score = 0;
    questions.forEach((q) => {
      const userAns = answers[q.question] || [];
      const correct = Array.isArray(q.answer)
        ? JSON.stringify(q.answer.slice().sort()) === JSON.stringify(userAns.slice().sort())
        : userAns[0] === q.answer;
      if (correct) score++;
    });
    return score;
  }

  function getMistakes() {
    const mistakes = [];
    questions.forEach((q) => {
      const userAns = answers[q.question] || [];
      const isCorrect = JSON.stringify((q.answer || []).slice().sort()) === JSON.stringify(userAns.slice().sort());
      if (!isCorrect) {
        mistakes.push({
          question: q.question,
          options: q.options,
          correct: Array.isArray(q.answer) ? q.answer : [q.answer],
          user: Array.isArray(userAns) ? userAns : [userAns]
        });
      }
    });
    return mistakes;
  }

  function prettyTime(s) {
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  }

  if (!questions.length) return <div>Caricamento domande…</div>;

  if (showResult) {
    const score = getScore();
    const mistakes = getMistakes();
    return (
      <div>
        <h2>Quiz completato!</h2>
        <p>Tempo totale: {prettyTime(Math.min(elapsed, MAX_TIME_SECONDS))}</p>
        <p>Corretti: {score} / {questions.length} ({((score/questions.length)*100).toFixed(1)}%)</p>
        <p>Esito: {score >= 68 ? "PROMOSSO" : "NON SUPERATO"}</p>
        <button onClick={startQuiz}>Nuovo Esame</button>
        <h3>Correzioni delle domande sbagliate:</h3>
        {mistakes.length === 0 ? (
          <p>Non hai sbagliato nessuna domanda!</p>
        ) : (
          <ul>
            {mistakes.map((m, idx) => (
              <li key={idx}>
                <strong>{m.question}</strong><br/>
                <span>Le tue risposte: {m.user.map(i => m.options[i]).join(', ') || "Nessuna"}</span><br/>
                <span>Corretto: {m.correct.map(i => m.options[i]).join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const q = questions[current];
  const answerKey = currentKey();

  return (
    <div>
      <h2>v6</h2>
      <br></br>
      <h3>Domanda {current + 1} / {questions.length}</h3>
      <p>{q.question}</p>
      <p>
        Timer: {prettyTime(elapsed)} / 60:00{" "}
        {paused ? (
          <button onClick={() => setPaused(false)}>Riprendi Timer</button>
        ) : (
          <button onClick={() => setPaused(true)}>Pausa Timer</button>
        )}
      </p>
      <ul>
        {q.options.map((option, idx) => (
          <li key={idx}>
            <label>
              <input
                type="checkbox"
                checked={Array.isArray(answers[answerKey]) && answers[answerKey].includes(idx)}
                onChange={() => handleMultiAnswer(idx)}
                disabled={paused}
              />
              {option}
            </label>
          </li>
        ))}
      </ul>
      <button onClick={nextQuestion} disabled={paused || !answers[answerKey] || answers[answerKey].length === 0}>
        {current + 1 === questions.length ? 'Termina e mostra risultato' : 'Prossima domanda'}
      </button>
      {elapsed >= MAX_TIME_SECONDS && (
        <div style={{ color: 'red', marginTop: 20 }}>Tempo scaduto! Quiz terminato automaticamente.</div>
      )}
    </div>
  );
}
