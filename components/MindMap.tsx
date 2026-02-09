
import React, { useState } from 'react';
import { Network, Plus, Minus, RefreshCw, ZoomIn, Info } from 'lucide-react';
import { MindMapNode } from '../types';
import { generateMindMapNode } from '../services/geminiService';

export const MindMap: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [rootNode, setRootNode] = useState<MindMapNode | null>(null);
    const [loading, setLoading] = useState(false);

    const handleStart = async () => {
        if (!topic.trim()) return;
        setLoading(true);
        const children = await generateMindMapNode(topic);
        setRootNode({
            id: 'root',
            label: topic,
            children: children,
            isExpanded: true
        });
        setLoading(false);
    };

    const toggleNode = async (node: MindMapNode, parentLabel: string) => {
        if (node.isExpanded) {
            // Collapse
            node.isExpanded = false;
            // Force re-render
            setRootNode(prev => prev ? { ...prev } : null);
        } else {
            // Expand
            if (node.children.length === 0) {
                node.isLoading = true;
                setRootNode(prev => prev ? { ...prev } : null); // Show loading state
                
                const newChildren = await generateMindMapNode(node.label, parentLabel);
                node.children = newChildren;
                node.isLoading = false;
            }
            node.isExpanded = true;
            setRootNode(prev => prev ? { ...prev } : null);
        }
    };

    // Recursive component to render nodes tree-style
    const NodeRenderer: React.FC<{ node: MindMapNode; depth: number; parentLabel: string }> = ({ node, depth, parentLabel }) => {
        const isRoot = depth === 0;
        
        return (
            <div className="flex flex-col items-center">
                <div 
                    onClick={() => !isRoot && toggleNode(node, parentLabel)}
                    className={`
                        relative z-10 flex items-center gap-2 px-6 py-3 rounded-full border-2 shadow-lg transition-all cursor-pointer hover:scale-105 select-none
                        ${isRoot 
                            ? 'bg-indigo-600 border-indigo-700 text-white text-xl font-bold' 
                            : node.isExpanded 
                                ? 'bg-white border-indigo-500 text-indigo-700 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                        }
                    `}
                >
                    <span>{node.label}</span>
                    {node.isLoading && <RefreshCw size={14} className="animate-spin" />}
                    {!isRoot && !node.isLoading && (
                        node.isExpanded ? <Minus size={14} /> : <Plus size={14} />
                    )}
                </div>

                {/* Render Children */}
                {node.isExpanded && node.children.length > 0 && (
                    <div className="relative mt-8 flex gap-8 items-start justify-center">
                         {/* Connecting Lines Logic is tough in pure CSS, simpler visual: */}
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 w-0.5 h-8 bg-slate-300" />
                         
                         {/* Horizontal connector bar */}
                         {node.children.length > 1 && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-300 -translate-y-4 mx-auto w-[calc(100%-2rem)]" />
                         )}

                        {node.children.map((child, idx) => (
                             <div key={child.id} className="relative flex flex-col items-center">
                                 {/* Vertical line from horizontal bar to child */}
                                 <div className="w-0.5 h-4 bg-slate-300 mb-4" />
                                 <NodeRenderer node={child} depth={depth + 1} parentLabel={node.label} />
                             </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-slate-50 relative">
            {/* Header / Input */}
            <div className="p-6 bg-white border-b border-slate-200 shadow-sm z-20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Network size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Infinite Mind Map</h1>
                        <p className="text-xs text-slate-500">Click any node to expand it infinitely using AI</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <input 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                        placeholder="Enter a topic (e.g. Nervous System)..."
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
                    />
                    <button 
                        onClick={handleStart}
                        disabled={loading || !topic.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="animate-spin"/> : 'Start'}
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto p-10 cursor-move relative">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                {!rootNode ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <ZoomIn size={64} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">Ready to map your mind.</p>
                        <p className="text-sm">Enter a topic above to begin.</p>
                    </div>
                ) : (
                    <div className="min-w-max min-h-max flex justify-center pb-20 origin-top transition-transform duration-500">
                        <NodeRenderer node={rootNode} depth={0} parentLabel="" />
                    </div>
                )}
            </div>
            
            {/* Floating Hint */}
            {rootNode && (
                <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur border border-indigo-100 p-4 rounded-xl shadow-xl max-w-xs animate-in slide-in-from-bottom-10">
                    <h4 className="flex items-center gap-2 text-indigo-700 font-bold mb-1"><Info size={16}/> How to use</h4>
                    <p className="text-xs text-slate-600">
                        Click on <strong>white nodes</strong> to ask the AI to generate deeper concepts for that specific branch.
                    </p>
                </div>
            )}
        </div>
    );
};
