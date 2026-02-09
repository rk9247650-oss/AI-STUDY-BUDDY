
import React from 'react';
import katex from 'katex';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Enhanced parser for Markdown + LaTeX
  const lines = content.split('\n');

  // Helper to process inline text with Bold, Italic, Code, and LaTeX Math
  const processInline = (text: string) => {
    // 1. Split by LaTeX delimiters ($...$)
    const parts = text.split(/(\$[^$]+\$)/g);
    
    return parts.map((part, index) => {
      // Handle LaTeX Math
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        try {
          const latex = part.slice(1, -1);
          const html = katex.renderToString(latex, { throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="mx-1" />;
        } catch (e) {
          return <span key={index} className="text-red-500">{part}</span>;
        }
      }

      // Handle Markdown formatting for non-math parts
      // Note: This is a simple regex replacement chain. Order matters.
      let html = part
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>') // Italic
        .replace(/`(.*?)`/g, '<code class="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded-md font-mono text-sm border border-slate-200">$1</code>') // Code
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-indigo-600 underline hover:text-indigo-800">$1</a>'); // Links

      return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
    });
  };
  
  return (
    <div className={`space-y-3 text-sm md:text-base leading-7 text-slate-700 ${className}`}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-2" />;

        // Headers
        if (line.startsWith('### ')) return <h3 key={index} className="text-lg font-bold text-indigo-700 mt-6 mb-2 flex items-center gap-2">{processInline(line.replace('### ', ''))}</h3>;
        if (line.startsWith('## ')) return <h2 key={index} className="text-xl font-bold text-indigo-800 mt-8 mb-3 border-b border-indigo-100 pb-2">{processInline(line.replace('## ', ''))}</h2>;
        if (line.startsWith('# ')) return <h1 key={index} className="text-2xl font-bold text-indigo-900 mt-8 mb-4">{processInline(line.replace('# ', ''))}</h1>;
        
        // Lists
        if (line.trim().startsWith('- ')) {
          return (
            <div key={index} className="flex items-start ml-2 mb-1">
              <span className="mr-3 text-indigo-500 mt-1.5">•</span>
              <div className="flex-1">{processInline(line.replace(/^\s*-\s/, ''))}</div>
            </div>
          );
        }
        
        // Numbered Lists
        if (/^\d+\.\s/.test(trimmed)) {
           return (
            <div key={index} className="flex items-start ml-2 mb-1">
              <span className="mr-2 font-bold text-indigo-600 min-w-[20px]">{trimmed.match(/^\d+\./)?.[0]}</span>
              <div className="flex-1">{processInline(trimmed.replace(/^\d+\.\s/, ''))}</div>
            </div>
          );
        }

        // Tables (Basic rendering for pipe tables)
        if (line.includes('|')) {
            const cells = line.split('|').filter(c => c.trim() !== '');
            // Skip divider rows (e.g. ---|---)
            if (line.match(/^[\s-+|]+$/)) return null;
            
            // Heuristic: If it looks like a table row, render vaguely as grid
            // Ideally, we'd group these, but for line-by-line:
            return (
                <div key={index} className="grid grid-flow-col auto-cols-auto gap-4 p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto">
                    {cells.map((cell, i) => (
                        <div key={i} className="min-w-[100px]">{processInline(cell.trim())}</div>
                    ))}
                </div>
            )
        }

        // Blockquotes
        if (line.startsWith('> ')) {
            return (
                <div key={index} className="border-l-4 border-indigo-400 pl-4 py-1 italic text-slate-600 bg-slate-50 rounded-r-lg my-2">
                    {processInline(line.replace('> ', ''))}
                </div>
            )
        }

        // Standard Paragraph
        return (
          <p key={index} className="mb-2">
            {processInline(line)}
          </p>
        );
      })}
    </div>
  );
};
