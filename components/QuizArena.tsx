import React, { useState } from 'react';
import { generateQuiz } from '../services/geminiService';
import { QuizQuestion } from '../types';
import { Zap, Check, X, Trophy, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import clsx from 'clsx'; // Simple conditional class helper

export const QuizArena: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);

  const startQuiz = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    const qs = await generateQuiz(topic, 'medium');
    setQuestions(qs);
    setLoading(false);
    setCurrentQIndex(0);
    setScore(0);
    setQuizComplete(false);
    setSelectedOption(null);
    setShowResult(false);
  };

  const handleOptionSelect = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    if (index === questions[currentQIndex].correctAnswerIndex) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(c => c + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Generating Quiz...</h2>
        <p className="text-slate-500">Preparing tricky questions on "{topic}"</p>
      </div>
    );
  }

  if (quizComplete) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-3xl shadow-xl text-center border border-slate-100 animate-in zoom-in duration-300">
        <div className="inline-flex p-4 bg-yellow-100 text-yellow-600 rounded-full mb-6">
          <Trophy size={48} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Quiz Complete!</h2>
        <p className="text-slate-500 mb-6">You scored</p>
        <div className="text-5xl font-black text-indigo-600 mb-8">
          {score} <span className="text-2xl text-slate-400 font-medium">/ {questions.length}</span>
        </div>
        <button 
          onClick={() => { setQuestions([]); setTopic(''); }}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
        >
          Try Another Topic
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-6 animate-in fade-in duration-500">
        <div className="inline-flex p-4 bg-emerald-100 text-emerald-600 rounded-2xl mb-4">
          <Zap size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Skill Check Quiz</h1>
        <p className="text-lg text-slate-500">Enter any topic (e.g., "Photosynthesis", "Calculus", "Mughal Empire") and I'll test your knowledge.</p>
        
        <div className="relative max-w-lg mx-auto">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startQuiz()}
            placeholder="Enter topic..."
            className="w-full px-6 py-4 text-lg bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-0 outline-none shadow-sm transition-all"
          />
          <button
            onClick={startQuiz}
            disabled={!topic.trim()}
            className="mt-4 w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-center mb-6 text-slate-500 font-medium">
        <span>Question {currentQIndex + 1} of {questions.length}</span>
        <span>Score: {score}</span>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-slate-100 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-1 bg-indigo-100 w-full">
            <div 
                className="h-full bg-indigo-600 transition-all duration-500" 
                style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
            />
        </div>
        
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 mt-2 leading-relaxed">
          {currentQ.question}
        </h2>

        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.correctAnswerIndex;
            const showCorrectness = showResult && isCorrect;
            const showWrong = showResult && isSelected && !isCorrect;

            let buttonClass = "border-slate-200 hover:bg-slate-50 hover:border-slate-300";
            if (showResult) {
                if (isCorrect) buttonClass = "bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500";
                else if (isSelected) buttonClass = "bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500";
                else buttonClass = "border-slate-100 text-slate-400 opacity-60";
            } else if (isSelected) {
                buttonClass = "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={showResult}
                className={clsx(
                  "w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center",
                  buttonClass
                )}
              >
                <span className="font-medium text-lg">{option}</span>
                {showCorrectness && <Check className="text-green-600" size={20} />}
                {showWrong && <X className="text-red-500" size={20} />}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-indigo-500 shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-slate-800 mb-1">Explanation</p>
                <p className="text-slate-600 leading-relaxed">{currentQ.explanation}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={nextQuestion}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                >
                    {currentQIndex === questions.length - 1 ? "Finish" : "Next Question"} <ArrowRight size={18} />
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};