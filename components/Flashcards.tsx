import React, { useState } from 'react';
import { generateFlashcards } from '../services/geminiService';
import { Flashcard } from '../types';
import { Layers, RotateCw, ArrowLeft, ArrowRight, Loader2, Brain } from 'lucide-react';

export const Flashcards: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    
    const result = await generateFlashcards(topic);
    setCards(result);
    setLoading(false);
  };

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(c => c + 1), 150);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(c => c - 1), 150);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
            <Layers className="text-indigo-600" /> Smart Flashcards
          </h1>
          <p className="text-slate-500">Master any topic with AI-generated quick-study cards</p>
        </div>

        {/* Input */}
        <div className="flex gap-2 max-w-xl mx-auto w-full relative">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic (e.g., Periodic Table, Mughal Emperors)"
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-70 shadow-md transition-all whitespace-nowrap"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Generate'}
          </button>
        </div>

        {/* Card Area */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          {cards.length > 0 ? (
            <div className="w-full max-w-lg perspective-1000">
              <div className="mb-4 text-center text-slate-400 font-medium">
                Card {currentIndex + 1} of {cards.length}
              </div>
              
              <div 
                className="relative w-full aspect-[4/3] cursor-pointer group"
                onClick={() => setIsFlipped(!isFlipped)}
                style={{ perspective: '1000px' }}
              >
                <div 
                    className={`relative w-full h-full transition-transform duration-500 transform-style-3d shadow-xl rounded-2xl border border-slate-200 ${isFlipped ? 'rotate-y-180' : ''}`}
                    style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                >
                  {/* Front */}
                  <div 
                    className="absolute inset-0 bg-white rounded-2xl p-8 flex flex-col items-center justify-center backface-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Question</span>
                    <p className="text-2xl font-bold text-slate-800 text-center leading-relaxed">
                      {cards[currentIndex].front}
                    </p>
                    <p className="absolute bottom-4 text-slate-400 text-xs flex items-center gap-1">
                      <RotateCw size={12} /> Click to flip
                    </p>
                  </div>

                  {/* Back */}
                  <div 
                    className="absolute inset-0 bg-indigo-600 rounded-2xl p-8 flex flex-col items-center justify-center backface-hidden rotate-y-180"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-4">Answer</span>
                    <p className="text-xl font-medium text-white text-center leading-relaxed">
                      {cards[currentIndex].back}
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-between items-center mt-8 px-4">
                <button 
                  onClick={prevCard}
                  disabled={currentIndex === 0}
                  className="p-3 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ArrowLeft size={24} />
                </button>
                <div className="flex gap-1">
                    {cards.map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                    ))}
                </div>
                <button 
                  onClick={nextCard}
                  disabled={currentIndex === cards.length - 1}
                  className="p-3 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ArrowRight size={24} />
                </button>
              </div>

            </div>
          ) : (
            !loading && (
              <div className="text-center text-slate-400 max-w-sm">
                <Brain size={64} className="mx-auto mb-4 opacity-20" />
                <p>No cards yet. Enter a topic above to generate a deck tailored to your syllabus.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};