
import React, { useRef, useState, useEffect } from 'react';
import { analyzeDrawing } from '../services/geminiService';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { PenTool, Eraser, Trash2, CheckCircle2, Loader2, Sparkles, Undo2 } from 'lucide-react';

export const MagicWhiteboard: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#1e293b'; // Slate 800 background (Greenboard/Blackboard vibe)
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
    }, []);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.beginPath();
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = (e as React.MouseEvent).clientX - rect.left;
            y = (e as React.MouseEvent).clientY - rect.top;
        }

        ctx.lineWidth = tool === 'eraser' ? 20 : 3;
        ctx.strokeStyle = tool === 'eraser' ? '#1e293b' : color;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setAnalysis(null);
        }
    };

    const handleAnalyze = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        setLoading(true);
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        const result = await analyzeDrawing(base64);
        setAnalysis(result);
        setLoading(false);
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden">
            <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                    <PenTool className="text-indigo-600" /> Board Pe Samjhao
                </h1>
                <p className="text-slate-500 text-sm">Draw your math problem or diagram, and Riya will solve it.</p>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
                {/* Canvas Container */}
                <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
                    {/* Toolbar */}
                    <div className="p-2 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setTool('pen')}
                                className={`p-2 rounded-lg transition-colors ${tool === 'pen' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                             >
                                 <PenTool size={20} />
                             </button>
                             <button 
                                onClick={() => setTool('eraser')}
                                className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                             >
                                 <Eraser size={20} />
                             </button>
                             <div className="w-px h-8 bg-slate-200 mx-1" />
                             {['#ffffff', '#facc15', '#f87171', '#4ade80', '#60a5fa'].map(c => (
                                 <button 
                                    key={c}
                                    onClick={() => { setColor(c); setTool('pen'); }}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c && tool === 'pen' ? 'border-slate-400 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                 />
                             ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={clearCanvas} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 relative cursor-crosshair touch-none bg-slate-800">
                        <canvas 
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseUp={stopDrawing}
                            onMouseMove={draw}
                            onTouchStart={startDrawing}
                            onTouchEnd={stopDrawing}
                            onTouchMove={draw}
                            className="absolute inset-0 w-full h-full"
                        />
                    </div>

                    {/* Action Button */}
                    <div className="absolute bottom-4 right-4">
                        <button 
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-70 disabled:scale-100"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} fill="currentColor" /> Ask Riya</>}
                        </button>
                    </div>
                </div>

                {/* Analysis Panel */}
                {(analysis || loading) && (
                    <div className="w-full md:w-1/3 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                        <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                <CheckCircle2 size={18} /> Solution
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {loading ? (
                                <div className="space-y-4">
                                    <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
                                    <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
                                    <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse" />
                                </div>
                            ) : (
                                <div className="prose prose-indigo prose-sm">
                                    <MarkdownRenderer content={analysis || ""} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
