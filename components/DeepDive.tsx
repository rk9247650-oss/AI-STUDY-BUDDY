
import React, { useState, useEffect } from 'react';
import { getDeepExplanation } from '../services/geminiService';
import { memoryService } from '../services/memoryService';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { Lightbulb, Search, Loader2, History, Trash2 } from 'lucide-react';
import { HistoryItem } from '../types';

export const DeepDive: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(memoryService.getByType('deepdive'));
  }, []);

  const handleSearch = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    const result = await getDeepExplanation(topic);
    setExplanation(result);
    
    const newItem = memoryService.saveItem({
      type: 'deepdive',
      title: topic,
      content: result,
      summary: `Deep dive on ${topic}`
    });
    
    if (newItem) setHistory(prev => [newItem, ...prev]);
    setLoading(false);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setTopic(item.title);
    setExplanation(item.content);
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
            className={`p-3 rounded-full shadow-lg transition-all ${showHistory ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
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
                  <History size={18} /> Previous Dives
              </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 && <p className="text-sm text-slate-400 text-center mt-10">No saved history yet.</p>}
              {history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="p-3 bg-white border border-slate-100 rounded-xl hover:border-amber-200 hover:shadow-sm cursor-pointer group relative"
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

      <div className="max-w-3xl mx-auto w-full space-y-8 overflow-y-auto pb-20 custom-scrollbar">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-2">
                <Lightbulb className="text-amber-500" fill="currentColor" /> Concept Deep Dive
            </h1>
            <p className="text-slate-500 mt-2">The Feynman Technique: Learn any topic at 3 levels of difficulty.</p>
        </div>

        <div className="relative">
             <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter a complex topic (e.g. Black Holes, Calculus, GDP)..."
                className="w-full pl-6 pr-32 py-4 text-lg bg-white border-2 border-slate-200 rounded-full focus:border-amber-400 focus:ring-0 outline-none shadow-sm transition-all"
             />
             <button 
                onClick={handleSearch}
                disabled={loading || !topic.trim()}
                className="absolute right-2 top-2 bottom-2 px-6 bg-amber-500 text-white font-bold rounded-full hover:bg-amber-600 disabled:opacity-70 transition-all flex items-center gap-2"
             >
                 {loading ? <Loader2 className="animate-spin" size={20}/> : <Search size={20}/>}
                 Explore
             </button>
        </div>

        {explanation && (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                <MarkdownRenderer content={explanation} className="prose-headings:text-amber-800 prose-strong:text-amber-700" />
            </div>
        )}
        
        {!explanation && !loading && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 opacity-60">
                 <div className="p-4 bg-slate-100 rounded-xl text-center">
                     <span className="text-2xl mb-2 block">👶</span>
                     <h3 className="font-bold text-slate-700">5-Year-Old</h3>
                     <p className="text-xs text-slate-500">Simple analogies</p>
                 </div>
                 <div className="p-4 bg-slate-100 rounded-xl text-center">
                     <span className="text-2xl mb-2 block">🎓</span>
                     <h3 className="font-bold text-slate-700">High School</h3>
                     <p className="text-xs text-slate-500">Standard definitions</p>
                 </div>
                 <div className="p-4 bg-slate-100 rounded-xl text-center">
                     <span className="text-2xl mb-2 block">🧠</span>
                     <h3 className="font-bold text-slate-700">Expert</h3>
                     <p className="text-xs text-slate-500">Deep nuances</p>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};
