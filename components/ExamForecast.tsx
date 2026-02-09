
import React, { useState, useEffect } from 'react';
import { generateExamForecast } from '../services/geminiService';
import { memoryService } from '../services/memoryService';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { TrendingUp, AlertTriangle, Target, Calculator, Loader2, History, Trash2, Flame } from 'lucide-react';
import { HistoryItem } from '../types';

export const ExamForecast: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [forecast, setForecast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(memoryService.getByType('forecast'));
  }, []);

  const handleGenerate = async () => {
    if (!subject.trim()) return;
    setLoading(true);
    const output = await generateExamForecast(subject);
    setForecast(output);
    
    const newItem = memoryService.saveItem({
      type: 'forecast',
      title: subject,
      content: output,
      summary: `Exam forecast for ${subject}`
    });
    
    if (newItem) setHistory(prev => [newItem, ...prev]);
    setLoading(false);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setSubject(item.title);
    setForecast(item.content);
    setShowHistory(false);
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    memoryService.deleteItem(id);
    setHistory(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden relative">
       <div className="absolute top-4 right-4 z-20">
        <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-3 rounded-full shadow-lg transition-all ${showHistory ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
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
                  <History size={18} /> Previous Forecasts
              </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 && <p className="text-sm text-slate-400 text-center mt-10">No saved forecasts.</p>}
              {history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="p-3 bg-white border border-slate-100 rounded-xl hover:border-orange-200 hover:shadow-sm cursor-pointer group relative"
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

      <div className="max-w-4xl mx-auto w-full space-y-6 overflow-y-auto pb-20 custom-scrollbar">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-2">
                <TrendingUp className="text-orange-600" /> Topper's Forecast
            </h1>
            <p className="text-slate-500 mt-2">AI prediction of probable topics based on BSEB patterns.</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
             <div className="flex-1 w-full">
                 <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="Enter Subject (e.g. Physics Class 12)..."
                    className="w-full px-5 py-4 text-lg bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-400 focus:ring-0 outline-none"
                 />
             </div>
             <button 
                onClick={handleGenerate}
                disabled={loading || !subject.trim()}
                className="w-full md:w-auto px-8 py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:opacity-70 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
             >
                 {loading ? <Loader2 className="animate-spin" size={20}/> : <><Flame size={20} fill="currentColor" /> Predict</>}
             </button>
        </div>

        {forecast && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* Visual Cards (Mockup derived from Text) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                        <h4 className="flex items-center gap-2 text-red-700 font-bold mb-1"><Flame size={16} /> Hot Topics</h4>
                        <p className="text-xs text-red-600 opacity-80">High probability</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                        <h4 className="flex items-center gap-2 text-blue-700 font-bold mb-1"><Calculator size={16} /> Numericals</h4>
                        <p className="text-xs text-blue-600 opacity-80">Calculation zone</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                        <h4 className="flex items-center gap-2 text-emerald-700 font-bold mb-1"><Target size={16} /> Long Ans</h4>
                        <p className="text-xs text-emerald-600 opacity-80">Derivations</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-2xl">
                        <h4 className="flex items-center gap-2 text-yellow-700 font-bold mb-1"><AlertTriangle size={16} /> Traps</h4>
                        <p className="text-xs text-yellow-600 opacity-80">Common mistakes</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
                    <MarkdownRenderer content={forecast} className="prose-headings:text-orange-800 prose-strong:text-orange-700" />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
