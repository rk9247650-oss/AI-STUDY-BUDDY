
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TutorChat } from './components/TutorChat';
import { StudyPlanner } from './components/StudyPlanner';
import { NotesGen } from './components/NotesGen';
import { QuizArena } from './components/QuizArena';
import { LiveSession } from './components/LiveSession';
import { Flashcards } from './components/Flashcards';
import { PdfReader } from './components/PdfReader';
import { SmartGrader } from './components/SmartGrader';
import { DeepDive } from './components/DeepDive';
import { MindMap } from './components/MindMap';
import { Mnemonics } from './components/Mnemonics';
import { FormulaSheet } from './components/FormulaSheet';
import { MagicWhiteboard } from './components/MagicWhiteboard';
import { ExamForecast } from './components/ExamForecast';
import { AppView, UserStats } from './types';
import { hasApiKey } from './services/geminiService';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  
  // Mock Stats
  const [stats] = useState<UserStats>({
    streak: 5,
    totalStudyHours: 24.5,
    questionsSolved: 142,
    accuracy: 88
  });

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard stats={stats} onChangeView={setCurrentView} />;
      case AppView.TUTOR:
        return <TutorChat onStartLiveSession={() => setCurrentView(AppView.LIVE)} />;
      case AppView.LIVE:
        return <LiveSession onEndSession={() => setCurrentView(AppView.TUTOR)} />;
      case AppView.PDF_READER:
        return <PdfReader />;
      case AppView.FLASHCARDS:
        return <Flashcards />;
      case AppView.PLANNER:
        return <StudyPlanner />;
      case AppView.NOTES:
        return <NotesGen />;
      case AppView.QUIZ:
        return <QuizArena />;
      case AppView.GRADER:
        return <SmartGrader />;
      case AppView.DEEP_DIVE:
        return <DeepDive />;
      case AppView.MINDMAP:
        return <MindMap />;
      case AppView.MNEMONICS:
        return <Mnemonics />;
      case AppView.FORMULAS:
        return <FormulaSheet />;
      case AppView.WHITEBOARD:
        return <MagicWhiteboard />;
      case AppView.FORECAST:
        return <ExamForecast />;
      default:
        return <Dashboard stats={stats} onChangeView={setCurrentView} />;
    }
  };

  if (!hasApiKey()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Configuration Error</h1>
          <p className="text-slate-600 mb-6">
            API Key is missing. Please ensure the <code className="bg-slate-100 px-2 py-1 rounded">API_KEY</code> environment variable is set in the runtime environment to use Gemini features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </Layout>
  );
}
