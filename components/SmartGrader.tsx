
import React, { useState, useEffect } from 'react';
import { gradeAnswer } from '../services/geminiService';
import { memoryService } from '../services/memoryService';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { CheckCircle2, Loader2, BookOpenCheck, History, Trash2 } from 'lucide-react';
import { HistoryItem } from '../types';

export const SmartGrader: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(memoryService.getByType('grade'));
  }, []);

  const handleGrade = async () => {
    if (!question.trim() || !answer.trim()) return;
    setLoading(true);
    const result = await gradeAnswer(question, answer);
    setFeedback(result);
    
    const newItem = memoryService.saveItem({
      type: 'grade',
      title: question,
      content: { answer, feedback: result },
      summary: `Graded question: ${question.slice(0,30)}...`
    });
    
    if (newItem) setHistory(prev => [newItem, ...prev]);
    setLoading(false);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setQuestion(item.title);
    setAnswer(item.content.answer);
    setFeedback(item.content.feedback);
    setShowHistory(false);
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    memoryService.deleteItem(id);
    setHistory(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-y-auto relative">
      <div className="absolute top-4 right-4 z-20">
        <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-3 rounded-full shadow-lg transition-all ${showHistory ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
            <History size={20} />
        </button>
      </div>

       {/* History Sidebar */}
       <div className={`
        absolute top-0 right-0 h-full w-80 bg-white shadow-2xl z-30 transform transition-transform duration-300 border-l border-slate-100 flex flex-col
        ${showHistory ? 'translate-x-0' : 'translate-x-full'}
      `}>
          <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <History size={18} /> Past Grades
              </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 && <p className="text-sm text-slate-400 text-center mt-10">No saved grades yet.</p>}
              {history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="p-3 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 hover:shadow-sm cursor-pointer group relative"
                  >
                      <p className="font-bold text-slate-700 text-sm truncate pr-6">{item.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                      <button 
                        onClick={(e) => deleteHistoryItem(e, item.id)}
                        className="absolute right-2 top-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                          <Trash2 size={12} />
                      </button>
                  </div>
              ))}
          </div>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                <BookOpenCheck className="text-emerald-600" /> AI Answer Reviewer
            </h1>
            <p className="text-slate-500 mt-2">Paste a question and your answer. I'll grade it and show you how to score full marks.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Question</label>
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="e.g. Explain the process of photosynthesis."
                        className="w-full h-32 p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Your Answer</label>
                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full h-64 p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-mono text-sm"
                    />
                </div>
                <button
                    onClick={handleGrade}
                    disabled={loading || !question.trim() || !answer.trim()}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-70 transition-all shadow-lg shadow-emerald-200 flex justify-center items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Grade My Answer'}
                </button>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 relative min-h-[500px]">
                {feedback ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto pr-2">
                        <MarkdownRenderer content={feedback} />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                        <CheckCircle2 size={64} className="mb-4 opacity-20" />
                        <p>Feedback will appear here.</p>
                        <p className="text-xs mt-2">I check for keywords, conceptual accuracy, and formatting.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
