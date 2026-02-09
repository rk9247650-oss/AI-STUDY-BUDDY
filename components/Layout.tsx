
import React from 'react';
import { AppView } from '../types';
import { 
  LayoutDashboard, 
  MessageSquare, 
  BookOpen, 
  CalendarDays, 
  Zap,
  Menu,
  X,
  Phone,
  Layers,
  FileText,
  BookOpenCheck,
  Lightbulb,
  Network,
  Wand2,
  Calculator,
  PenTool,
  TrendingUp
} from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onViewChange, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ view, icon: Icon, label }: { view: AppView; icon: any; label: string }) => (
    <button
      onClick={() => {
        onViewChange(view);
        setIsMobileMenuOpen(false);
      }}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
        currentView === view 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-50">
        <span className="font-bold text-xl text-indigo-700">AI Study Buddy</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={clsx(
        "fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out md:transform-none flex flex-col p-4",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 mb-6 flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">SB</div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Study Buddy</h1>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          <NavItem view={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem view={AppView.TUTOR} icon={MessageSquare} label="AI Tutor" />
          <NavItem view={AppView.LIVE} icon={Phone} label="Live Call" />
          <NavItem view={AppView.WHITEBOARD} icon={PenTool} label="Magic Whiteboard" />
          <NavItem view={AppView.MINDMAP} icon={Network} label="Infinite Mind Map" />
          <NavItem view={AppView.PDF_READER} icon={FileText} label="PDF Assistant" />
          
          <div className="pt-2 pb-1 px-4 text-xs font-bold text-slate-400 uppercase">Tools</div>
          <NavItem view={AppView.FORECAST} icon={TrendingUp} label="Topper's Forecast" />
          <NavItem view={AppView.MNEMONICS} icon={Wand2} label="Yaad Ka Jugad" />
          <NavItem view={AppView.FORMULAS} icon={Calculator} label="Formula Sheet" />
          <NavItem view={AppView.DEEP_DIVE} icon={Lightbulb} label="Deep Dive" />
          <NavItem view={AppView.GRADER} icon={BookOpenCheck} label="Answer Grader" />
          <NavItem view={AppView.FLASHCARDS} icon={Layers} label="Flashcards" />
          <NavItem view={AppView.PLANNER} icon={CalendarDays} label="Planner" />
          <NavItem view={AppView.NOTES} icon={BookOpen} label="Notes Generator" />
          <NavItem view={AppView.QUIZ} icon={Zap} label="Quiz Arena" />
        </nav>

        <div className="p-4 bg-indigo-50 rounded-2xl mt-4">
          <p className="text-xs font-bold text-indigo-800 uppercase mb-1">Pro Tip 💡</p>
          <p className="text-xs text-indigo-600 leading-relaxed">
            Use "Magic Whiteboard" to solve math problems instantly!
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0 relative w-full">
        {children}
      </main>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
