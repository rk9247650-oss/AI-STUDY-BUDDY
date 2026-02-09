import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Send, Bot, User, Trash2, Maximize2, Loader2, FileType, X } from 'lucide-react';
import { ChatMessage } from '../types';
import { chatWithPdf } from '../services/geminiService';
import { MarkdownRenderer } from './ui/MarkdownRenderer';

export const PdfReader: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setPdfBase64(base64);
        setMessages([{
          id: '0',
          role: 'model',
          text: `I've loaded **${file.name}**. You can now ask me to summarize it, explain specific topics, or create a quiz based on it!`,
          timestamp: Date.now()
        }]);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const handleClear = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfFile(null);
    setPdfUrl(null);
    setPdfBase64(null);
    setMessages([]);
    setInput('');
  };

  const handleSend = async () => {
    if (!input.trim() || !pdfBase64) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const response = await chatWithPdf(messages, userMsg.text, pdfBase64);

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response,
      timestamp: Date.now()
    }]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!pdfFile) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div 
                className="group relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer w-full max-w-2xl"
                onClick={() => fileInputRef.current?.click()}
            >
                <input 
                    type="file" 
                    accept="application/pdf" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                />
                <div className="bg-indigo-100 p-8 rounded-full text-indigo-600 mb-8 group-hover:scale-110 transition-transform shadow-sm">
                    <Upload size={48} strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-3">Upload your PDF</h2>
                <p className="text-slate-500 max-w-md text-center text-lg">
                    Drag & drop or click to upload lecture notes, textbooks, or papers. 
                    <br/><span className="text-indigo-600 font-medium">AI will help you read & understand them.</span>
                </p>
                
                <div className="mt-10 flex gap-6 text-sm font-medium text-slate-400">
                    <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200"><FileType size={16}/> PDF Only</span>
                    <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200"><Maximize2 size={16}/> Max 20MB</span>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
      {/* PDF Viewer Pane */}
      <div className="flex-1 bg-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col relative animate-in slide-in-from-left duration-500">
        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md z-10 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                <div className="bg-red-500 p-1.5 rounded shrink-0">
                    <FileText size={16} className="text-white" />
                </div>
                <span className="font-medium truncate text-slate-200 text-sm" title={pdfFile.name}>
                    {pdfFile.name}
                </span>
            </div>
            <button 
                onClick={handleClear} 
                className="p-2 ml-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors shrink-0"
                title="Close PDF"
            >
                <X size={20} />
            </button>
        </div>
        
        <div className="flex-1 w-full h-full relative bg-slate-200">
            {pdfUrl && (
                <object
                    data={pdfUrl}
                    type="application/pdf"
                    className="absolute inset-0 w-full h-full"
                >
                    <div className="flex items-center justify-center h-full text-slate-500 flex-col gap-2 p-4 text-center">
                        <p className="font-medium">Unable to display PDF directly.</p>
                        <a 
                            href={pdfUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-indigo-600 underline hover:text-indigo-800"
                        >
                            Click here to open PDF
                        </a>
                    </div>
                </object>
            )}
        </div>
      </div>

      {/* Chat Pane */}
      <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-right duration-500">
        <div className="p-4 border-b border-slate-100 bg-white z-10 shrink-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <Bot size={24} className="text-indigo-600" /> PDF Assistant
            </h3>
            <p className="text-xs text-slate-500 pl-8">Ask questions, get summaries, or find details.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 scroll-smooth">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                        {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                    </div>
                    <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-2xl text-sm md:text-base shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                            {msg.role === 'model' ? <MarkdownRenderer content={msg.text} /> : msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                </div>
            ))}
            {loading && (
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Bot size={20} />
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                         <Loader2 size={16} className="animate-spin text-indigo-600" />
                         <span className="text-sm text-slate-500 font-medium">Analyzing document...</span>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <div className="relative">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about this PDF..."
                    disabled={loading}
                    rows={1}
                    className="w-full bg-slate-100 border-0 rounded-2xl pl-4 pr-12 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none overflow-hidden"
                    style={{ minHeight: '48px' }}
                />
                <button 
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="absolute right-2 top-1.5 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
