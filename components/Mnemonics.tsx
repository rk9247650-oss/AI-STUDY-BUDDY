
import React, { useState, useEffect } from 'react';
import { generateMnemonic } from '../services/geminiService';
import { memoryService } from '../services/memoryService';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { Lightbulb, Wand2, Loader2, Sparkles, History, Trash2, ChevronRight } from 'lucide-react';
import { HistoryItem } from '../types';

export const Mnemonics: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [items, setItems] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(memoryService.getByType('mnemonic'));
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    const output = await generateMnemonic(topic, items);
    setResult(output);
    
    // Save to memory
    const newItem = memoryService.saveItem({
      type: 'mnemonic',
      title: topic,
      content: output,
      summary: `Mnemonic for ${topic}`
    });
    
    if (newItem) setHistory(prev => [newItem, ...prev]);
    setLoading(false);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setTopic(item.title);
    setResult(item.content);
    setItems('');
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
            className={`p-3 rounded-full shadow-lg transition-all ${showHistory ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
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
                  <History size={18} /> Past Jugads
              </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 && <p className="text-sm text-slate-400 text-center mt-10">No saved jugads yet.</p>}
              {history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="p-3 bg-white border border-slate-100 rounded-xl hover:border-purple-200 hover:shadow-sm cursor-pointer group relative"
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

      <div className="max-w-3xl mx-auto w-full space-y-6 overflow-y-auto pb-20 custom-scrollbar">
        <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                <Wand2 className="text-purple-600" /> Yaad Karne Ka Jugad
            </h1>
            <p className="text-slate-500 mt-2">Struggling to memorize a list? I'll make a Desi trick for you!</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Topic Name</label>
                <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Periodic Table Group 1, Mughal Emperors, Planets"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>
            
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Items (Optional - Paste the list here)</label>
                <textarea 
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
                    placeholder="e.g. Hydrogen, Lithium, Sodium, Potassium..."
                    className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
            </div>

            <button 
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-70 transition-all flex justify-center items-center gap-2 shadow-lg shadow-purple-200"
            >
                {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> Create Magic Trick</>}
            </button>
        </div>

        {result && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-8 rounded-3xl border border-purple-100 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Lightbulb size={120} className="text-purple-600" />
                </div>
                <div className="relative z-10">
                    <MarkdownRenderer content={result} />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
