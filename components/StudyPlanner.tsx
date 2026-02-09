
import React, { useState, useEffect } from 'react';
import { StudyPlanDay } from '../types';
import { generateStudyPlan } from '../services/geminiService';
import { Calendar, Clock, Book, Plus, Trash2, CheckCircle2, Loader2, History, Menu, ChevronRight, Layout, ArrowLeft, Target } from 'lucide-react';

interface SavedPlan {
  id: string;
  title: string;
  subjects: string[];
  hours: number;
  examDate: string;
  schedule: StudyPlanDay[];
  createdAt: number;
}

const STORAGE_KEY = 'study_planner_history';

export const StudyPlanner: React.FC = () => {
  // Form State
  const [subjects, setSubjects] = useState<string[]>(['Mathematics', 'Physics']);
  const [newSubject, setNewSubject] = useState('');
  const [hours, setHours] = useState(4);
  const [examDate, setExamDate] = useState('');
  
  // History & View State
  const [history, setHistory] = useState<SavedPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Load History on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load plan history", e);
    }
  }, []);

  const saveHistory = (newHistory: SavedPlan[]) => {
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  };

  const handleAddSubject = () => {
    if (newSubject.trim()) {
      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject('');
    }
  };

  const createNewPlan = () => {
    setSelectedPlanId(null);
    setSubjects(['Mathematics', 'Physics']);
    setHours(4);
    setExamDate('');
    setShowSidebar(false);
  };

  const handleDeletePlan = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this study plan?")) {
      const updated = history.filter(h => h.id !== id);
      saveHistory(updated);
      if (selectedPlanId === id) setSelectedPlanId(null);
    }
  };

  const handleGenerate = async () => {
    if (!examDate) {
      alert("Please set an exam date!");
      return;
    }
    if (subjects.length === 0) {
      alert("Please add at least one subject.");
      return;
    }

    setLoading(true);
    const schedule = await generateStudyPlan(subjects, hours, examDate);
    
    const newPlan: SavedPlan = {
      id: Date.now().toString(),
      title: subjects.slice(0, 2).join(', ') + (subjects.length > 2 ? ` +${subjects.length - 2}` : ''),
      subjects,
      hours,
      examDate,
      schedule,
      createdAt: Date.now()
    };

    const updatedHistory = [newPlan, ...history];
    saveHistory(updatedHistory);
    setSelectedPlanId(newPlan.id);
    setLoading(false);
  };

  // Determine view
  const activePlan = history.find(h => h.id === selectedPlanId);

  return (
    <div className="flex h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 relative ring-1 ring-slate-900/5">
      
      {/* Sidebar - History */}
      <div className={`
          absolute md:relative inset-y-0 left-0 w-80 bg-white border-r border-slate-100 z-30 transform transition-transform duration-300 flex flex-col shadow-xl md:shadow-none
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
          <div className="p-6 flex items-center justify-between">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                    <History size={20} strokeWidth={2.5} />
                 </div>
                 <span className="font-bold text-slate-800 text-lg">My Plans</span>
             </div>
             <button onClick={() => setShowSidebar(false)} className="md:hidden p-2 text-slate-400">
                 <Menu size={24} />
             </button>
          </div>

          <div className="px-4 mb-2">
            <button 
                onClick={createNewPlan} 
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all"
            >
                <Plus size={18} strokeWidth={3} /> New Plan
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar">
              {history.length === 0 && (
                  <div className="text-center text-slate-400 mt-10 p-4">
                      <Layout size={40} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs">No saved plans yet.</p>
                  </div>
              )}
              {history.map(plan => (
                  <div 
                    key={plan.id}
                    onClick={() => { setSelectedPlanId(plan.id); setShowSidebar(false); }}
                    className={`
                        group relative p-4 rounded-2xl cursor-pointer border transition-all duration-200
                        ${selectedPlanId === plan.id 
                            ? 'bg-white border-indigo-200 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.15)] ring-1 ring-indigo-50' 
                            : 'bg-slate-50 border-transparent hover:bg-slate-100'}
                    `}
                  >
                      <div className="flex justify-between items-start mb-1">
                          <h4 className={`font-bold text-sm truncate pr-6 ${selectedPlanId === plan.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                              {plan.title}
                          </h4>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                          <span className="flex items-center gap-1"><Clock size={10} /> {plan.hours}h/day</span>
                          <span className="flex items-center gap-1"><Target size={10} /> {new Date(plan.examDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                      </div>
                      
                      <button 
                        onClick={(e) => handleDeletePlan(e, plan.id)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-300 transition-all"
                        title="Delete Plan"
                      >
                          <Trash2 size={14} />
                      </button>
                  </div>
              ))}
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
          
          {/* Header */}
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
              <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                  <Menu size={24} />
              </button>
              {activePlan && (
                  <button onClick={createNewPlan} className="md:hidden flex items-center gap-1 text-xs font-bold text-slate-500">
                      <ArrowLeft size={14} /> Back
                  </button>
              )}
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="text-indigo-600" size={20} />
                  {activePlan ? 'Your Strategy' : 'Create New Strategy'}
              </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {!activePlan ? (
                // --- CREATE FORM VIEW ---
                <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-slate-900">Let's build your roadmap 🚀</h1>
                            <p className="text-slate-500 mt-2 text-sm">Define your goals and I'll optimize your schedule.</p>
                        </div>

                        <div className="space-y-6">
                            {/* Subjects Input */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Target Subjects</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {subjects.map((sub, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2 border border-indigo-100">
                                        {sub}
                                        <button onClick={() => setSubjects(subjects.filter(s => s !== sub))} className="hover:text-indigo-900 p-0.5 rounded-full hover:bg-indigo-200"><Trash2 size={12}/></button>
                                    </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newSubject}
                                        onChange={(e) => setNewSubject(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                                        placeholder="Add subject (e.g. Organic Chemistry)"
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                    <button onClick={handleAddSubject} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Hours Slider */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Daily Study Budget</label>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <Clock className="text-indigo-500" size={20} />
                                            <span className="text-2xl font-bold text-slate-800">{hours} <span className="text-sm text-slate-400 font-normal">hrs</span></span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="1" 
                                            max="12" 
                                            value={hours} 
                                            onChange={(e) => setHours(parseInt(e.target.value))}
                                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium">
                                            <span>Light (1h)</span>
                                            <span>Intense (12h)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Date Picker */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Exam Target Date</label>
                                    <div className="relative">
                                        <input 
                                            type="date" 
                                            value={examDate}
                                            onChange={(e) => setExamDate(e.target.value)}
                                            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                                        />
                                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.01] transition-all disabled:opacity-70 disabled:scale-100 flex justify-center items-center gap-2 mt-4"
                            >
                                {loading ? <><Loader2 className="animate-spin" /> Generating Plan...</> : "Generate My Plan 🚀"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // --- ACTIVE PLAN VIEW ---
                <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-500 space-y-6">
                    {/* Plan Header Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Book size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-indigo-200 font-medium mb-1 flex items-center gap-2"><Target size={16}/> Exam Date: {new Date(activePlan.examDate).toLocaleDateString()}</p>
                                    <h1 className="text-3xl font-bold mb-2">{activePlan.title}</h1>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {activePlan.subjects.map((sub, i) => (
                                            <span key={i} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold border border-white/10">
                                                {sub}
                                            </span>
                                        ))}
                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold border border-white/10 flex items-center gap-1">
                                            <Clock size={12} /> {activePlan.hours}h / day
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                             <Layout size={20} className="text-indigo-500" /> 5-Day Roadmap
                        </h3>
                        {activePlan.schedule.map((day, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-700 font-bold text-lg shadow-sm">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg">{day.day}</h4>
                                            <p className="text-indigo-600 font-medium text-sm flex items-center gap-1">
                                                <Target size={14} /> Focus: {day.focus}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-100 px-4 py-1.5 rounded-full text-slate-600 text-xs font-bold flex items-center gap-1.5 w-fit">
                                        <Clock size={14} /> {day.hours} Hours
                                    </div>
                                </div>
                                <div className="space-y-2.5 pl-4 border-l-2 border-slate-100 ml-6">
                                    {day.tasks.map((task, tIdx) => (
                                        <div key={tIdx} className="flex items-start gap-3">
                                            <div className="mt-1 text-slate-300 group-hover:text-emerald-500 transition-colors">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed font-medium">{task}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};
