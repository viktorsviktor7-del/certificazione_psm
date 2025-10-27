import React, { useEffect, useState, useRef } from "react";
import IndexScreen from "./screen/IndexScreen";
import ModeScreen from "./screen/ModeScreen";
import StartScreen from "./screen/StartScreen";
import QuizScreen from "./screen/QuizScreen";
import ResultScreen from "./screen/ResultScreen";
import quizDataPSM1 from "./data/quiz.json";
import quizDataGlossario from "./data/newQuizGlossario.json";
import "./css/App.css";

// Percentuale domande PSM1 per sotto-categoria
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

const MAX_TIME_SECONDS = 60 * 60;
const QUIZ_SIZE = 80;

// Fisher-Yates Shuffle
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Genera quiz PSM1 bilanciato
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

export default function App() {
  // Stati globali
  const [selectedFile, setSelectedFile] = useState(null); // "psm1" o "glossario"
  const [selectedMode, setSelectedMode] = useState(null); // "exam" o "practice"
  const [quizStarted, setQuizStarted] = useState(false);
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
    const sourceData = selectedFile === "psm1" ? quizDataPSM1 : quizDataGlossario;
    let selectedQuestions;
    if (selectedMode === "practice") {
      selectedQuestions = shuffle(sourceData);
    } else {
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

  // ROUTING LOGICO: rende solo la screen necessaria
  if (!selectedFile)
    return <IndexScreen onSelectFile={setSelectedFile} />;

  if (!selectedMode)
    return <ModeScreen selectedFile={selectedFile} onSelectMode={setSelectedMode} onBack={() => setSelectedFile(null)} />;

  if (!quizStarted)
    return <StartScreen
      selectedFile={selectedFile}
      selectedMode={selectedMode}
      startQuiz={startQuiz}
      onBack={() => setSelectedMode(null)}
    />;

  if (showResult)
    return <ResultScreen
      questions={questions}
      answers={answers}
      selectedFile={selectedFile}
      selectedMode={selectedMode}
      elapsed={elapsed}
      resetToSelection={resetToSelection}
    />;

  return (
    <QuizScreen
      questions={questions}
      current={current}
      setCurrent={setCurrent}
      answers={answers}
      setAnswers={setAnswers}
      selectedMode={selectedMode}
      paused={paused}
      setPaused={setPaused}
      elapsed={elapsed}
      setShowResult={setShowResult}
      showLiveStats={showLiveStats}
      setShowLiveStats={setShowLiveStats}
    />
  );
}
