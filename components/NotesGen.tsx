
import React, { useState, useEffect } from 'react';
import { generateNotes } from '../services/geminiService';
import { memoryService } from '../services/memoryService';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { FileText, Download, Loader2, History, Trash2 } from 'lucide-react';
import { HistoryItem } from '../types';

export const NotesGen: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(memoryService.getByType('note'));
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    const result = await generateNotes(topic);
    setNotes(result);
    
    const newItem = memoryService.saveItem({
      type: 'note',
      title: topic,
      content: result,
      summary: `Study notes for ${topic}`
    });
    
    if (newItem) setHistory(prev => [newItem, ...prev]);
    setLoading(false);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setTopic(item.title);
    setNotes(item.content);
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
                  <History size={18} /> My Notes
              </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 && <p className="text-sm text-slate-400 text-center mt-10">No saved notes yet.</p>}
              {history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm cursor-pointer group relative"
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

        <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col overflow-hidden">
            <div className="text-center shrink-0">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                    <FileText className="text-indigo-600" /> Smart Notes Generator
                </h1>
            </div>

            <div className="flex gap-2 max-w-2xl mx-auto w-full shrink-0">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic (e.g., Newton's Laws, French Revolution)"
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button
                    onClick={handleGenerate}
                    disabled={loading || !topic.trim()}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-70 shadow-md transition-all whitespace-nowrap"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Create Notes'}
                </button>
            </div>

            {notes && (
                <div className="flex-1 overflow-y-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mt-6 animate-in fade-in duration-500 custom-scrollbar">
                    <div className="flex justify-end mb-4">
                        <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                            <Download size={16} /> Save as PDF
                        </button>
                    </div>
                    <div className="prose prose-indigo max-w-none">
                        <MarkdownRenderer content={notes} />
                    </div>
                </div>
            )}
            
            {!notes && !loading && (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p>Enter a topic to generate exam-ready notes instantly.</p>
                 </div>
            )}
        </div>
    </div>
  );
};
