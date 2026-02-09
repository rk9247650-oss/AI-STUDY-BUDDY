
export enum AppView {
  DASHBOARD = 'dashboard',
  TUTOR = 'tutor',
  PLANNER = 'planner',
  NOTES = 'notes',
  QUIZ = 'quiz',
  ANALYTICS = 'analytics',
  LIVE = 'live',
  FLASHCARDS = 'flashcards',
  PDF_READER = 'pdf_reader',
  GRADER = 'grader',
  DEEP_DIVE = 'deep_dive',
  MINDMAP = 'mindmap',
  MNEMONICS = 'mnemonics',
  FORMULAS = 'formulas',
  WHITEBOARD = 'whiteboard',
  FORECAST = 'forecast'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 image string
  timestamp: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface StudyPlanDay {
  day: string;
  focus: string;
  tasks: string[];
  hours: number;
}

export interface Note {
  id: string;
  topic: string;
  content: string; // Markdown content
  timestamp: number;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface UserStats {
  streak: number;
  totalStudyHours: number;
  questionsSolved: number;
  accuracy: number;
}

export interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

// --- NEW MEMORY TYPES ---
export type HistoryType = 'mnemonic' | 'formula' | 'note' | 'deepdive' | 'grade' | 'quiz' | 'flashcard' | 'live_session' | 'forecast';

export interface HistoryItem {
  id: string;
  type: HistoryType;
  title: string;
  content: any; // Flexible content payload
  timestamp: number;
  summary?: string; // Short summary for Long Term Memory context
}
