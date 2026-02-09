
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, GraduationCap, RefreshCw, Volume2, Image as ImageIcon, Mic, X, Brain, Phone, Loader2, Sparkles, Trash2, Settings2, Images, Download, FileText, History, MessageSquare, Plus, Menu, ChevronLeft, ChevronRight, Share2, MoreVertical, Timer, Play, Pause, Square, Zap, Lightbulb, Flame, ClipboardList } from 'lucide-react';
import { ChatMessage } from '../types';
import { chatWithTutor, generateSpeech, transcribeUserAudio, generateEducationalImage, generateNotes } from '../services/geminiService';
import { memoryService } from '../services/memoryService'; // Import Memory Service
import { MarkdownRenderer } from './ui/MarkdownRenderer';

interface TutorChatProps {
    onStartLiveSession?: () => void;
}

interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    updatedAt: number;
}

const STORAGE_KEY = 'study_buddy_sessions';

// Random Welcomes
const WELCOME_MESSAGES = [
    "Aur Dev! Kaisi chal rahi hai padhai? 🚀",
    "Pranam! Aaj kya phodna hai exam mein? 🔥",
    "Bolo Guru! Kaha fase ho aaj? 🤔",
    "Padhai shuru karein ya bas baatein karni hain? 😉",
    "Hello topper! Aaj konsa topic clear karna hai? 📚"
];

export const TutorChat: React.FC<TutorChatProps> = ({ onStartLiveSession }) => {
  // --- State Management ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // UI State
  const [showSidebar, setShowSidebar] = useState(false); // Mobile toggle
  const [showGallery, setShowGallery] = useState(false);
  const [showImageSettings, setShowImageSettings] = useState(false);
  
  // Feature Settings
  const [examMode, setExamMode] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState('4:3');
  const [imageStyle, setImageStyle] = useState('realistic');
  
  // Timer State
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60); // Default 25 mins
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  // Media / Inputs
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // --- Initialization ---
  useEffect(() => {
    const loadSessions = () => {
        try {
            const savedSessions = localStorage.getItem(STORAGE_KEY);
            if (savedSessions) {
                const parsed = JSON.parse(savedSessions);
                if (Array.isArray(parsed)) {
                    return parsed.sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
                }
            }
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
        return [];
    };

    const initialSessions = loadSessions();
    
    if (initialSessions.length > 0) {
        setSessions(initialSessions);
        setCurrentSessionId(initialSessions[0].id);
        setMessages(initialSessions[0].messages);
    } else {
        createNewSession();
    }
  }, []);

  // --- Timer Logic ---
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
      // Optional: Play a sound here
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const setTimerPreset = (minutes: number) => {
    setTimerSeconds(minutes * 60);
    setIsTimerRunning(false);
  };

  // --- Sync Messages to Session & Storage ---
  useEffect(() => {
    if (!currentSessionId) return;

    setSessions(prevSessions => {
        const sessionIndex = prevSessions.findIndex(s => s.id === currentSessionId);
        
        // SAFETY CHECK: If session was deleted, do NOT re-add it.
        if (sessionIndex === -1) return prevSessions;

        const currentSession = prevSessions[sessionIndex];
        // Optimization: Only update if messages count changed or last message text changed
        if (currentSession.messages.length === messages.length && 
            currentSession.messages[currentSession.messages.length-1]?.text === messages[messages.length-1]?.text) {
             return prevSessions;
        }

        const updatedSession = { ...currentSession, messages, updatedAt: Date.now() };

        // Auto-generate title
        if ((updatedSession.title === 'New Chat' || updatedSession.title === 'Restored Chat') && messages.length > 1) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                let newTitle = firstUserMsg.text.slice(0, 30);
                if (firstUserMsg.text.length > 30) newTitle += '...';
                updatedSession.title = newTitle;
            }
        }

        const newSessions = [...prevSessions];
        newSessions[sessionIndex] = updatedSession;
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
        return newSessions;
    });
  }, [messages, currentSessionId]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewSession = () => {
    const randomWelcome = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
    const newSession: ChatSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [{
            id: '1',
            role: 'model',
            text: randomWelcome,
            timestamp: Date.now()
        }],
        updatedAt: Date.now()
    };
    
    setSessions(prev => {
        const updated = [newSession, ...prev];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    });
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
    setShowSidebar(false);
  };

  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        setCurrentSessionId(session.id);
        setMessages(session.messages);
        setShowSidebar(false);
    }
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat?")) return;

    const newSessions = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
    setSessions(newSessions);

    if (currentSessionId === sessionId) {
        if (newSessions.length > 0) {
            const nextSession = newSessions[0];
            setCurrentSessionId(nextSession.id);
            setMessages(nextSession.messages);
        } else {
            createNewSession();
        }
    }
  };

  const resetCurrentChat = () => {
    if (!currentSessionId) return;
    if (!window.confirm("Are you sure you want to clear the current conversation?")) return;
    
    const randomWelcome = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

    const initialMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: randomWelcome,
        timestamp: Date.now()
    };

    setMessages([initialMsg]);
    
    setSessions(prev => {
        const updated = prev.map(s => {
            if (s.id === currentSessionId) {
                return { ...s, messages: [initialMsg], title: 'New Chat', updatedAt: Date.now() };
            }
            return s;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    });
  };

  const exportChat = () => {
      const chatContent = messages.map(m => `${m.role.toUpperCase()} (${new Date(m.timestamp).toLocaleString()}): ${m.text}`).join('\n\n');
      const blob = new Blob([chatContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-buddy-chat-${new Date().toISOString()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleSend = async (manualInput?: string) => {
    const textToSend = manualInput || input;
    if ((!textToSend.trim() && !selectedImage) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      image: selectedImage || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    const userContext = memoryService.getUserContext();

    try {
        const responseText = await chatWithTutor(
            messages.concat(userMsg), 
            userMsg.text, 
            userMsg.image || null,
            { examMode, thinkingMode, userContext, imageStyle, imageAspectRatio }
        );

        // Check for Image Generation Tag [[GENERATE_IMAGE: ...]]
        const imageTagRegex = /\[\[GENERATE_IMAGE:\s*(.*?)\]\]/;
        const match = responseText.match(imageTagRegex);

        let finalBotText = responseText;
        let generatedImage = null;

        if (match) {
            const imagePrompt = match[1];
            // Remove the tag from the displayed text
            finalBotText = responseText.replace(match[0], '').trim();
            
            // Generate the image automatically
            // We keep isLoading true while generating image so user sees Riya is "working"
            try {
                generatedImage = await generateEducationalImage(imagePrompt, imageAspectRatio, imageStyle);
            } catch (err) {
                console.error("Auto image gen failed", err);
            }
        }

        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: finalBotText || "...", // Fallback if empty
          image: generatedImage || undefined,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, botMsg]);
    } catch (error) {
        console.error("Chat Error", error);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "Arre yaar, network issue hai lagta hai. Wapas bolna?",
            timestamp: Date.now()
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  // --- Helper Functions ---
  const handleGenerateImage = async () => {
    if (!input.trim() || isLoading) return;
    const prompt = input;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: `Generate ${imageStyle}: ${prompt}`, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setShowImageSettings(false);

    try {
        const base64Image = await generateEducationalImage(prompt, imageAspectRatio, imageStyle);
        const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: base64Image ? `Here is a ${imageStyle} for "${prompt}":` : `Could not generate image.`, image: base64Image || undefined, timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
    } catch (error) {
        console.error(error);
    } finally { setIsLoading(false); }
  };

  const handleGenerateNotes = async () => {
    if (!input.trim() || isLoading) return;
    const topic = input;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: `Create notes on: ${topic}`, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const notes = await generateNotes(topic);
        const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: notes, timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            setIsLoading(true);
            const transcription = await transcribeUserAudio(base64String);
            setInput(prev => prev + " " + transcription);
            setIsLoading(false);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playTTS = async (text: string, msgId: string) => {
    if (playingAudioId === msgId) return; 
    try {
        setPlayingAudioId(msgId);
        const audioData = await generateSpeech(text);
        if (audioData) {
            const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
            audio.onended = () => setPlayingAudioId(null);
            audio.play();
        } else { setPlayingAudioId(null); }
    } catch (e) { setPlayingAudioId(null); }
  };

  const downloadImage = (base64: string, id: string) => {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${base64}`;
    link.download = `study-buddy-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const triggerQuickAction = (type: 'rapidfire' | 'mnemonic' | 'vvi' | 'recap') => {
      let prompt = "";
      switch(type) {
          case 'rapidfire': prompt = "Let's play Rapid Fire! Ask me 5 quick conceptual questions on the current topic one by one."; break;
          case 'mnemonic': prompt = "Mujhe is topic ko yaad karne ka koi Desi Jugad (Mnemonic) batao."; break;
          case 'vvi': prompt = "Is topic se related Exam ke liye VVI (Very Very Important) points batao."; break;
          case 'recap': prompt = "Abhi tak jo discuss kiya uska short Summary (Recap) dedo."; break;
      }
      handleSend(prompt);
  };

  const galleryImages = messages.filter(m => m.role === 'model' && m.image);

  // Styles list for Image Generation
  const imageStyles = [
      { id: 'realistic', label: 'Realistic' },
      { id: 'diagram', label: 'Diagram' },
      { id: 'illustration', label: 'Illustration' },
      { id: 'sketch', label: 'Sketch' },
      { id: 'watercolor', label: 'Watercolor' },
      { id: 'anime', label: 'Anime' },
      { id: '3d-render', label: '3D Render' },
      { id: 'pixel-art', label: 'Pixel Art' },
      { id: 'vintage', label: 'Vintage' },
      { id: 'cyberpunk', label: 'Cyberpunk' },
  ];

  return (
    <div className="flex h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 relative ring-1 ring-slate-900/5 font-sans">
      
      {/* Sidebar - History */}
      <div className={`
          absolute md:relative inset-y-0 left-0 w-80 bg-white border-r border-slate-100 z-30 transform transition-transform duration-300 flex flex-col shadow-xl md:shadow-none
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
          <div className="p-5 flex items-center justify-between border-b border-slate-50">
             <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <History size={18} strokeWidth={2.5} />
                 </div>
                 <span className="font-bold text-slate-800 text-lg tracking-tight">History</span>
             </div>
             <button onClick={createNewSession} className="w-9 h-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all border border-slate-100 shadow-sm" title="New Chat">
                 <Plus size={18} strokeWidth={3} />
             </button>
             <button onClick={() => setShowSidebar(false)} className="md:hidden p-2 text-slate-400 absolute right-4 top-6">
                 <X size={24} />
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar bg-slate-50/50">
              {sessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => switchSession(session.id)}
                    className={`
                        group relative p-4 rounded-2xl cursor-pointer border transition-all duration-200
                        ${currentSessionId === session.id 
                            ? 'bg-white border-indigo-200 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.1)]' 
                            : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}
                    `}
                  >
                      <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-lg ${currentSessionId === session.id ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"}`}>
                            <MessageSquare size={16} strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                              <p className={`text-sm font-semibold truncate ${currentSessionId === session.id ? "text-slate-900" : "text-slate-600"}`}>
                                  {session.title}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                                  {new Date(session.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                              </p>
                          </div>
                      </div>
                      <button 
                        onClick={(e) => deleteSession(e, session.id)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-300 transition-all"
                        title="Delete Chat"
                      >
                          <Trash2 size={14} />
                      </button>
                  </div>
              ))}
          </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative z-0">
          
          {/* Header */}
          <div className="bg-white px-6 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20">
            <div className="flex items-center gap-4 overflow-hidden">
              <button onClick={() => setShowSidebar(!showSidebar)} className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-xl">
                  <Menu size={24} className="text-slate-700"/>
              </button>
              
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 hidden md:flex">
                <Bot size={24} />
              </div>
              
              <div className="min-w-0 flex flex-col">
                <h2 className="font-bold text-slate-900 text-base md:text-lg flex items-center gap-2 truncate">
                    {sessions.find(s => s.id === currentSessionId)?.title || "Riya"}
                </h2>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100 w-fit">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">ONLINE</span>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
               {onStartLiveSession && (
                   <button 
                    onClick={onStartLiveSession}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full font-semibold text-xs md:text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                   >
                       <Phone size={14} fill="currentColor" /> <span className="hidden md:inline">Live Call</span>
                   </button>
               )}
               
               <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
               
               <button 
                onClick={() => setShowTimer(!showTimer)}
                className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${showTimer ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}
                title="Focus Timer"
               >
                 <Timer size={18} />
               </button>

               <button 
                onClick={() => setThinkingMode(!thinkingMode)}
                className={`p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ${thinkingMode ? 'text-purple-600 bg-purple-50' : ''}`}
                title="Deep Thinking Mode"
              >
                <Brain size={18} />
              </button>
    
               <button 
                onClick={() => setExamMode(!examMode)}
                className={`p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ${examMode ? 'text-red-600 bg-red-50' : ''}`}
                title="BSEB Exam Mode"
              >
                <GraduationCap size={18} />
              </button>
              
               <button 
                onClick={resetCurrentChat}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors"
                title="Reset Conversation"
              >
                <RefreshCw size={18} />
              </button>

              <button 
                onClick={exportChat}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Download Chat"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>
    
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth bg-slate-50/30 relative">
            
            {/* Timer Widget */}
            {showTimer && (
              <div className="absolute top-4 right-4 z-40 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 w-64 animate-in slide-in-from-top-2">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><Timer size={16} className="text-indigo-500"/> Focus Timer</h3>
                    <button onClick={() => setShowTimer(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                 </div>
                 
                 <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                    <span className="text-4xl font-mono font-bold text-slate-800 tracking-wider">
                      {formatTime(timerSeconds)}
                    </span>
                 </div>

                 <div className="flex gap-2 justify-center mb-4">
                    {!isTimerRunning ? (
                      <button onClick={() => setIsTimerRunning(true)} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex-1 flex justify-center"><Play size={20} fill="currentColor" /></button>
                    ) : (
                      <button onClick={() => setIsTimerRunning(false)} className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all flex-1 flex justify-center"><Pause size={20} fill="currentColor" /></button>
                    )}
                    <button onClick={() => { setIsTimerRunning(false); setTimerSeconds(25*60); }} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"><Square size={20} /></button>
                 </div>

                 <div className="grid grid-cols-3 gap-2">
                    {[5, 25, 45].map(m => (
                       <button key={m} onClick={() => setTimerPreset(m)} className="px-2 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                         {m}m
                       </button>
                    ))}
                 </div>
              </div>
            )}

            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-100 select-none animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-lg border border-slate-100 flex items-center justify-center mb-6 transform rotate-3">
                         <Bot size={40} className="text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Pranam! 🙏</h3>
                    <p className="text-slate-500 font-medium text-sm">BSEB Exam ki taiyari shuru karein?</p>
                    <div className="flex gap-2 mt-6">
                        {['Force Formula', 'Mughal Empire', 'Photoelectric Effect'].map(t => (
                            <button key={t} onClick={() => setInput(t)} className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex items-start gap-3 md:gap-4 max-w-[95%] md:max-w-[85%] lg:max-w-[75%] animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shadow-sm ${
                  msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 text-indigo-600'
                }`}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={22} />}
                </div>
                
                <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
                    <div className={`px-5 py-4 text-sm md:text-base leading-relaxed overflow-hidden break-words shadow-sm ${
                    msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none shadow-indigo-200' 
                        : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-none shadow-sm'
                    }`}>
                    {msg.image && (
                        <div className="relative group inline-block max-w-full mb-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                            <img 
                                src={`data:image/jpeg;base64,${msg.image}`} 
                                alt="Context" 
                                className="max-w-full h-auto object-contain max-h-[350px]"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); downloadImage(msg.image!, msg.id); }}
                                    className="p-3 bg-white text-indigo-600 rounded-full hover:scale-110 transition-transform shadow-xl"
                                >
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {msg.role === 'model' ? <MarkdownRenderer content={msg.text} /> : <p className="whitespace-pre-wrap font-medium">{msg.text}</p>}
                    </div>
                    
                    {msg.role === 'model' && (
                        <div className="flex items-center gap-2 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => playTTS(msg.text, msg.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${playingAudioId === msg.id ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-slate-100 text-slate-500 hover:text-indigo-600 hover:border-indigo-100'}`}
                            >
                                {playingAudioId === msg.id ? <Loader2 size={12} className="animate-spin" /> : <Volume2 size={12} />}
                                {playingAudioId === msg.id ? 'Playing' : 'Listen'}
                            </button>
                        </div>
                    )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start gap-4 max-w-[80%] animate-in fade-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shadow-sm">
                  <RefreshCw size={16} className="animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 px-6 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                    <span className="text-sm font-medium text-slate-600">
                        {thinkingMode ? "Riya soch rahi hain..." : "Riya likh rahi hai..."}
                    </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
    
          {/* Input Area */}
          <div className="p-4 md:p-6 relative z-20 bg-white border-t border-slate-50">
            {/* Popups */}
            <div className="absolute bottom-full left-6 mb-2 flex flex-col gap-2">
                {selectedImage && (
                    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 p-2 rounded-xl w-fit shadow-lg animate-in slide-in-from-bottom-2">
                        <img src={`data:image/jpeg;base64,${selectedImage}`} className="w-12 h-12 object-cover rounded-lg bg-white" />
                        <div>
                            <p className="text-xs font-bold text-indigo-700">Image Attached</p>
                        </div>
                        <button onClick={() => setSelectedImage(null)} className="p-1.5 hover:bg-indigo-200 rounded-full text-indigo-700 ml-2"><X size={14}/></button>
                    </div>
                )}
                {showImageSettings && (
                    <div className="w-72 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-2 mb-2">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Sparkles size={12} className="text-purple-500"/> Image Studio</h3>
                            <button onClick={() => setShowImageSettings(false)}><X size={14} className="text-slate-400 hover:text-red-500"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-2">Aspect Ratio</label>
                                <div className="grid grid-cols-3 gap-1">
                                    {['1:1', '4:3', '16:9'].map(ratio => (
                                        <button key={ratio} onClick={() => setImageAspectRatio(ratio)} className={`px-2 py-2 text-xs rounded-lg border font-medium transition-all ${imageAspectRatio === ratio ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' : 'border-slate-100 text-slate-600 hover:bg-slate-50'}`}>{ratio}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-2">Art Style</label>
                                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {imageStyles.map(style => (
                                        <button key={style.id} onClick={() => setImageStyle(style.id)} className={`px-2 py-2 text-xs rounded-lg border capitalize font-medium transition-all text-left truncate ${imageStyle === style.id ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200' : 'border-slate-100 text-slate-600 hover:bg-slate-50'}`}>{style.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => triggerQuickAction('rapidfire')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 whitespace-nowrap transition-colors">
                    <Zap size={14} fill="currentColor" /> Rapid Fire
                </button>
                <button onClick={() => triggerQuickAction('mnemonic')} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-100 whitespace-nowrap transition-colors">
                    <Lightbulb size={14} /> Yaad Kara Do
                </button>
                 <button onClick={() => triggerQuickAction('vvi')} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-bold border border-orange-100 whitespace-nowrap transition-colors">
                    <Flame size={14} fill="currentColor" /> VVI Points
                </button>
                 <button onClick={() => triggerQuickAction('recap')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100 whitespace-nowrap transition-colors">
                    <ClipboardList size={14} /> Summary
                </button>
            </div>
    
            {/* Input Bar */}
            <div className="bg-slate-50 p-2 rounded-[24px] shadow-sm border border-slate-200 flex items-end gap-2 pl-4 transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 focus-within:bg-white">
                {/* Left Tools */}
                <div className="flex gap-1 items-center pb-2 pr-2 mr-1 border-r border-slate-200">
                     <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                     <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:bg-white hover:text-indigo-600 rounded-xl transition-all hover:shadow-sm" title="Upload Image"><ImageIcon size={20} strokeWidth={2}/></button>
                     <button onClick={() => setShowImageSettings(!showImageSettings)} className={`p-2 rounded-xl transition-all hover:shadow-sm ${showImageSettings ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-white hover:text-indigo-600'}`} title="Image Settings"><Settings2 size={20} strokeWidth={2}/></button>
                </div>

                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isRecording ? "Listening..." : "Ask me anything..."}
                    className="flex-1 bg-transparent border-none outline-none py-3 text-slate-800 placeholder:text-slate-400 resize-none h-12 min-h-[48px] max-h-32 text-base scroll-smooth"
                    style={{ lineHeight: '1.5' }}
                />
                
                {/* Right Actions */}
                <div className="flex items-center gap-1.5 pb-1 pr-1">
                     <div className="hidden sm:flex items-center gap-1">
                        <button onClick={handleGenerateImage} className="p-2.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="Generate Image"><Sparkles size={20} /></button>
                        <button onClick={handleGenerateNotes} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Generate Notes"><FileText size={20} /></button>
                     </div>
                     
                     <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block mb-2"></div>

                     <button onClick={isRecording ? stopRecording : startRecording} className={`p-2.5 rounded-xl transition-all mb-1 ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}><Mic size={20} /></button>
                     
                     <button 
                        onClick={() => handleSend()} 
                        disabled={(!input.trim() && !selectedImage) || isLoading} 
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed mb-1"
                    >
                        <Send size={18} fill="currentColor" className="ml-0.5" />
                    </button>
                </div>
            </div>
            
            <p className="text-center text-[10px] text-slate-400 mt-3 font-medium opacity-70">
                Gemini galati kar sakta hai. NCERT se verify kar lein.
            </p>
          </div>

          {/* Gallery Overlay */}
          {showGallery && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/80">
                   <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><Images size={22} className="text-indigo-600"/> Generated Images <span className="text-sm font-normal text-slate-500">({galleryImages.length})</span></h3>
                   <button onClick={() => setShowGallery(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                   {galleryImages.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                        <div className="p-6 bg-white rounded-full shadow-sm">
                            <Images size={48} className="text-indigo-200" />
                        </div>
                        <p className="font-medium">No images generated yet.</p>
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {galleryImages.map((msg) => (
                          <div key={msg.id} className="group relative aspect-square bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all">
                             <img src={`data:image/jpeg;base64,${msg.image}`} alt="Generated content" className="w-full h-full object-cover"/>
                             <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                                <button onClick={() => downloadImage(msg.image!, msg.id)} className="p-3 bg-white text-indigo-600 rounded-full hover:scale-110 transition-transform shadow-xl"><Download size={24} /></button>
                             </div>
                             <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-white text-xs truncate font-medium">{new Date(msg.timestamp).toLocaleDateString()}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
            </div>
          )}
      </div>
    </div>
  );
};
