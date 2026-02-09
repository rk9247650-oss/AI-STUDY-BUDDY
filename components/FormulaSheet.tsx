
import React, { useState, useEffect } from 'react';
import { generateFormulaSheet } from '../services/geminiService';
import { memoryService } from '../services/memoryService';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { Calculator, Sigma, Loader2, Download, History, Trash2 } from 'lucide-react';
import { HistoryItem } from '../types';

export const FormulaSheet: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [sheet, setSheet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(memoryService.getByType('formula'));
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    const output = await generateFormulaSheet(topic);
    setSheet(output);
    
    const newItem = memoryService.saveItem({
      type: 'formula',
      title: topic,
      content: output,
      summary: `Formula Sheet for ${topic}`
    });
    
    if (newItem) setHistory(prev => [newItem, ...prev]);
    setLoading(false);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setTopic(item.title);
    setSheet(item.content);
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
            className={`p-3 rounded-full shadow-lg transition-all ${showHistory ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
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
                  <History size={18} /> Saved Sheets
              </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 && <p className="text-sm text-slate-400 text-center mt-10">No saved sheets yet.</p>}
              {history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-sm cursor-pointer group relative"
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
            <h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                <Calculator className="text-blue-600" /> VVI Formula Sheet
            </h1>
            <p className="text-slate-500 mt-2">Get all important formulas for any chapter in one place.</p>
        </div>

        <div className="flex gap-2 max-w-xl mx-auto w-full">
             <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Chapter Name (e.g. Trigonometry, Electricity, Integration)"
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
             />
             <button 
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-70 transition-all flex items-center gap-2 shadow-md shadow-blue-200 whitespace-nowrap"
             >
                 {loading ? <Loader2 className="animate-spin" /> : <><Sigma size={18} /> Generate</>}
             </button>
        </div>

        {sheet && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="flex justify-end mb-4">
                     <button className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
                         <Download size={14} /> Print / Save
                     </button>
                </div>
                <div className="prose prose-blue max-w-none prose-table:border-collapse prose-td:border prose-td:border-slate-200 prose-td:p-2 prose-th:bg-slate-50 prose-th:p-2 prose-th:text-left">
                    <MarkdownRenderer content={sheet} />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
