
import React, { useEffect, useRef, useState } from 'react';
import { ai } from '../services/geminiService';
import { memoryService } from '../services/memoryService';
import { LiveServerMessage, Modality } from '@google/genai';
import { HistoryItem } from '../types';
import { 
  Mic, 
  PhoneOff, 
  Pause, 
  Play, 
  MessageSquare, 
  X, 
  MicOff, 
  History, 
  Trash2, 
  Calendar, 
  Loader2, 
  Zap, 
  Maximize2, 
  Activity,
  User,
  Bot,
  Monitor,
  Eye,
  StopCircle,
  Signal,
  AlertCircle
} from 'lucide-react';

interface LiveSessionProps {
  onEndSession: () => void;
}

interface TranscriptItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  isPartial?: boolean;
  timestamp: number;
}

// --- Audio Utilities ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const LiveSession: React.FC<LiveSessionProps> = ({ onEndSession }) => {
  // --- State ---
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'permission_denied'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Screen Share State
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Visualizer State
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 1
  const [isSpeaking, setIsSpeaking] = useState(false); // Model is outputting audio
  
  // UI State
  const [showChat, setShowChat] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [duration, setDuration] = useState(0);

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [pastSessions, setPastSessions] = useState<HistoryItem[]>([]);

  // --- Refs ---
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null); // Output
  const inputContextRef = useRef<AudioContext | null>(null); // Input
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Screen Share Refs
  const screenStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenIntervalRef = useRef<any>(null);

  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  
  // Transcription Buffers
  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');
  
  // Error handling refs
  const retryCountRef = useRef(0);
  const transcriptionEnabledRef = useRef(true);

  // --- Life Cycle & Timer ---
  useEffect(() => {
    setPastSessions(memoryService.getByType('live_session'));
    
    // Call Timer
    const timer = setInterval(() => {
        if (status === 'connected' && !isPaused) {
            setDuration(prev => prev + 1);
        }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, isPaused]);

  // Auto-scroll Chat
  useEffect(() => {
    if (chatScrollRef.current) {
        setTimeout(() => {
            if (chatScrollRef.current) {
                chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
            }
        }, 50);
    }
  }, [transcript, showChat, isSpeaking]);

  // --- Core Cleanup ---
  const cleanup = () => {
    console.log("Cleaning up session...");
    stopScreenShare(); // Ensure screen share is stopped

    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputContextRef.current) {
        inputContextRef.current.close();
        inputContextRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    sourcesRef.current.forEach(s => {
        try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
  };

  // --- Screen Share Logic ---
  const stopScreenShare = () => {
      if (screenIntervalRef.current) {
          clearInterval(screenIntervalRef.current);
          screenIntervalRef.current = null;
      }
      if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
  };

  const startScreenShare = async () => {
      try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                  width: { max: 1280 },
                  height: { max: 720 },
                  frameRate: { max: 5 } // Low FPS for analysis
              },
              audio: false // We only want video for vision analysis
          });

          screenStreamRef.current = displayStream;
          
          // Attach to hidden video element to capture frames
          if (videoRef.current) {
              videoRef.current.srcObject = displayStream;
              await videoRef.current.play();
          }

          // Handle user clicking "Stop sharing" on browser UI
          displayStream.getVideoTracks()[0].onended = () => {
              stopScreenShare();
          };

          setIsScreenSharing(true);

          // Start sending frames
          // Send 1 frame per second (1 FPS) to save bandwidth/tokens while allowing analysis
          screenIntervalRef.current = setInterval(() => {
              // Ensure we have a valid session before trying to send
              if (!sessionRef.current || !videoRef.current || !canvasRef.current || isPaused) return;
              
              const ctx = canvasRef.current.getContext('2d');
              if (!ctx) return;

              // Draw video frame to canvas
              const width = videoRef.current.videoWidth;
              const height = videoRef.current.videoHeight;
              
              // Scale down if too massive (e.g. 4k screen) to max 800px width for speed
              const scale = Math.min(1, 800 / width);
              canvasRef.current.width = width * scale;
              canvasRef.current.height = height * scale;
              
              ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
              
              // Get Base64
              const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
              
              // Send to Gemini
              // We check sessionRef.current above, but try/catch block is safer for network errors
              try {
                  sessionRef.current.sendRealtimeInput({
                      media: {
                          mimeType: 'image/jpeg',
                          data: base64Data
                      }
                  });
              } catch (err) {
                  console.error("Failed to send screen frame:", err);
              }

          }, 1000); // 1000ms = 1 second interval

      } catch (e: any) {
          console.error("Screen Share Error:", e);
          setErrorMessage("Screen share failed. Permissions denied?");
          setTimeout(() => setErrorMessage(null), 4000);
          stopScreenShare();
      }
  };

  const toggleScreenShare = () => {
      if (isScreenSharing) {
          stopScreenShare();
      } else {
          startScreenShare();
      }
  };


  // --- Start Session ---
  const startSession = async () => {
    try {
      setStatus('connecting');
      setErrorMessage(null);
      cleanup();

      // 1. Get Microphone
      let stream: MediaStream;
      try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000,
                channelCount: 1
            } 
          });
      } catch (e: any) {
          console.error("Mic Error:", e);
          setStatus('permission_denied');
          return;
      }
      
      if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
      }
      streamRef.current = stream;

      // 2. Setup Audio Contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;

      await inputCtx.resume();
      await outputCtx.resume();
      
      const outputGainNode = outputCtx.createGain();
      outputGainNode.connect(outputCtx.destination);

      // 3. Connect to Gemini Live
      // Using Promise pattern to prevent race conditions as per SDK guidelines
      
      // Determine configuration based on whether transcription is enabled
      const liveConfig: any = {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `
            You are **Riya**, a 17-year-old student from Patna, Bihar.
            You are Dev's **best friend** on a video call.

            ### 🎭 YOUR PERSONALITY:
            - **Super Expressive:** Use a lively, variable tone. Don't be monotonous.
            - **Hinglish Slang:** Use "Arre", "Yaar", "Bawal", "Matlab", "Samjhe?".
            - **Emotionally Intelligent:** If Dev sounds low, sound concerned. If he sounds happy, match his energy.

            ### 🚫 DO NOT:
            - **Do NOT** sound like a robot or a teacher.
            - **Do NOT** say "As an AI model".
            - **Do NOT** give long lectures. Speak in short, conversational bursts.

            ### 📸 VISION CAPABILITIES:
            - You can **see** Dev's screen if he shares it.
            - React naturally: "Arre wah! Ye kya dikha raha hai?" or "Oho, ye question toh tricky lag raha hai."

            ### 🗣️ CONVERSATION STYLE:
            - Treat this like a WhatsApp voice note or a Facetime call.
            - Use fillers like "Hmm", "Acha", "Sunn na" to sound natural.
          `,
      };
      
      if (transcriptionEnabledRef.current) {
          liveConfig.inputAudioTranscription = {};
          liveConfig.outputAudioTranscription = {};
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: liveConfig,
        callbacks: {
          onopen: () => {
            if (mountedRef.current) setStatus('connected');
            
            // Setup Input Processing
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (!mountedRef.current || isPaused || isMuted) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Visualizer Logic (RMS)
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setAudioLevel(prev => Math.max(rms * 5, prev * 0.8)); // Smoothing

              // Send to Gemini using the sessionPromise to ensure active session
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                  try {
                      session.sendRealtimeInput({ media: pcmBlob });
                  } catch (err) {
                      // Silent catch for dropped frames during closing/pausing
                  }
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!mountedRef.current) return;
            const content = msg.serverContent;
            if (!content) return;

            // --- 1. Handle Transcripts (If available) ---
            let transcriptUpdated = false;

            // Transcriptions
            if (content.inputTranscription?.text) {
                currentInputRef.current += content.inputTranscription.text;
                transcriptUpdated = true;
            }
            if (content.outputTranscription?.text) {
                currentOutputRef.current += content.outputTranscription.text;
                transcriptUpdated = true;
            }

            // Commit Transcript on Turn Complete
            if (content.turnComplete) {
                const now = Date.now();
                setTranscript(prev => {
                    const clean = prev.filter(t => !t.isPartial);
                    const newItems: TranscriptItem[] = [];
                    
                    if (currentInputRef.current.trim()) {
                        newItems.push({
                            id: `user-${now}`, role: 'user', text: currentInputRef.current.trim(), timestamp: now, isPartial: false
                        });
                        currentInputRef.current = '';
                    }
                    if (currentOutputRef.current.trim()) {
                        newItems.push({
                            id: `model-${now}`, role: 'model', text: currentOutputRef.current.trim(), timestamp: now, isPartial: false
                        });
                        currentOutputRef.current = '';
                    }
                    return [...clean, ...newItems];
                });
                setIsSpeaking(false);
            } else if (transcriptUpdated) {
                // Show Real-time Typing
                setTranscript(prev => {
                    const clean = prev.filter(t => !t.isPartial);
                    const partials: TranscriptItem[] = [];
                    if (currentInputRef.current) {
                        partials.push({ id: 'temp-user', role: 'user', text: currentInputRef.current, timestamp: Date.now(), isPartial: true });
                    }
                    if (currentOutputRef.current) {
                        partials.push({ id: 'temp-model', role: 'model', text: currentOutputRef.current, timestamp: Date.now(), isPartial: true });
                    }
                    return [...clean, ...partials];
                });
            }

            // --- 2. Handle Audio Output ---
            if (isPaused) return;

            const audioData = content.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
                setIsSpeaking(true);
                
                // Audio Scheduling
                if (nextStartTimeRef.current < outputCtx.currentTime) {
                    nextStartTimeRef.current = outputCtx.currentTime;
                }

                try {
                    const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                    const source = outputCtx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(outputGainNode);
                    
                    source.onended = () => {
                        sourcesRef.current.delete(source);
                        if (sourcesRef.current.size === 0) {
                            // Small delay to prevent flickering
                            setTimeout(() => {
                                if (sourcesRef.current.size === 0) setIsSpeaking(false);
                            }, 200);
                        }
                    };

                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += buffer.duration;
                    sourcesRef.current.add(source);
                } catch (e) {
                    console.error("Audio Decode Error", e);
                }
            }

            // --- 3. Handle Interruption ---
            if (content.interrupted) {
                console.log("Interrupted!");
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsSpeaking(false);
                currentOutputRef.current = ''; // Clear pending text
                // Force cleanup of partial model transcripts
                setTranscript(prev => prev.filter(t => !t.isPartial || t.role === 'user'));
            }
          },
          onclose: () => console.log("Session closed"),
          onerror: (err: any) => {
            console.error("Live Error:", err);
            const msg = err.message || "";
            if (mountedRef.current) {
                // Auto Fallback for Transcription Not Implemented Error
                if ((msg.includes("implemented") || msg.includes("supported")) && transcriptionEnabledRef.current && retryCountRef.current === 0) {
                     console.warn("Transcription not supported, retrying in audio-only mode...");
                     setErrorMessage("Transcription unavailable. Switching to audio-only...");
                     transcriptionEnabledRef.current = false;
                     retryCountRef.current = 1;
                     cleanup();
                     // Retry connection
                     setTimeout(() => startSession(), 500);
                     return;
                }

                setStatus('error');
                setErrorMessage("Network Error. Please retry.");
            }
          }
        }
      });

      // Wait for session to connect
      const session = await sessionPromise;
      if (!mountedRef.current) {
          session.close();
          return;
      }
      sessionRef.current = session;

    } catch (e) {
      console.error("Connection Failed:", e);
      if (mountedRef.current) {
          setStatus('error');
          setErrorMessage("Failed to establish connection.");
      }
      cleanup();
    }
  };

  // --- Initial Mount ---
  useEffect(() => {
    mountedRef.current = true;
    startSession();
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // --- Handlers ---
  const togglePause = () => {
      if (isPaused) {
          setIsPaused(false);
          if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
          if (inputContextRef.current?.state === 'suspended') inputContextRef.current.resume();
      } else {
          setIsPaused(true);
          // Stop all audio immediately
          sourcesRef.current.forEach(s => s.stop());
          sourcesRef.current.clear();
          nextStartTimeRef.current = 0;
          setIsSpeaking(false);
          setAudioLevel(0);
      }
  };

  const endCall = () => {
      // Save session
      if (transcript.length > 0) {
          const firstMsg = transcript.find(t => t.role === 'user' && !t.isPartial)?.text || "Voice Conversation";
          memoryService.saveItem({
              type: 'live_session',
              title: firstMsg,
              content: transcript.filter(t => !t.isPartial),
              summary: "Live Call with Riya"
          });
      }
      onEndSession();
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Render ---
  return (
    <div className="fixed inset-0 bg-slate-950 text-white z-50 flex overflow-hidden font-sans">
        
        {/* Error Toast */}
        {errorMessage && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg z-[60] animate-in fade-in slide-in-from-top-2 backdrop-blur-md border border-red-400/50 flex items-center gap-2">
                <AlertCircle size={16} /> {errorMessage}
            </div>
        )}
        
        {/* === Background Ambient Effects === */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

        {/* HIDDEN ELEMENTS FOR SCREEN CAPTURE */}
        <video ref={videoRef} className="hidden" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* === Left Side: History Panel (Slide-out) === */}
        <div className={`
            absolute inset-y-0 left-0 w-80 bg-slate-900/90 backdrop-blur-xl border-r border-white/5 z-40 transform transition-transform duration-300 flex flex-col shadow-2xl
            ${showHistory ? 'translate-x-0' : '-translate-x-full'}
        `}>
             <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-slate-200 flex items-center gap-2"><History size={18}/> Call History</h3>
                <button onClick={() => setShowHistory(false)}><X size={20} className="text-slate-400 hover:text-white"/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {pastSessions.map(sess => (
                    <div key={sess.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer group relative">
                        <p className="font-bold text-sm truncate pr-4 text-slate-300">{sess.title}</p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                             <Calendar size={10} /> {new Date(sess.timestamp).toLocaleDateString()}
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); memoryService.deleteItem(sess.id); setPastSessions(prev => prev.filter(i => i.id !== sess.id)); }}
                            className="absolute right-2 top-2 p-1.5 rounded-lg text-slate-500 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                {pastSessions.length === 0 && <p className="text-center text-slate-600 text-sm mt-10">No recent calls.</p>}
             </div>
        </div>

        {/* === Center: The "Quantum Core" Visualizer === */}
        <div className={`flex-1 flex flex-col relative transition-all duration-300 ${showChat ? 'w-full lg:w-[65%]' : 'w-full'}`}>
            
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowHistory(true)} className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-all">
                        <History size={20} />
                    </button>
                    
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/40 backdrop-blur border border-white/5">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
                        <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                            {status === 'connected' ? (isPaused ? 'Signal Paused' : 'Live Uplink Active') : 'Establishing Link...'}
                        </span>
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <span className="text-xs font-mono text-slate-400">{formatTime(duration)}</span>
                    </div>

                    {/* Vision Indicator */}
                    {isScreenSharing && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-purple-500/10 border border-purple-500/50 text-purple-400 animate-in fade-in slide-in-from-top-2">
                             <Eye size={14} className="animate-pulse" />
                             <span className="text-[10px] font-bold uppercase tracking-widest">Vision Active</span>
                        </div>
                    )}
                </div>

                <button onClick={() => setShowChat(!showChat)} className="lg:hidden p-3 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                    <MessageSquare size={20} />
                </button>
            </div>

            {/* Visualizer Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                
                {/* Status Text */}
                <div className="absolute top-[20%] text-center space-y-2 transition-opacity duration-300">
                    {isSpeaking ? (
                        <div className="flex items-center gap-2 text-indigo-400 bg-indigo-950/50 px-4 py-1 rounded-full border border-indigo-500/30 animate-in fade-in slide-in-from-bottom-2">
                             <Activity size={14} className="animate-pulse" />
                             <span className="text-xs font-bold tracking-[0.2em] uppercase">Riya Speaking</span>
                        </div>
                    ) : (
                        <div className={`flex items-center gap-2 px-4 py-1 rounded-full border transition-all ${audioLevel > 0.01 ? 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30' : 'text-slate-500 bg-transparent border-transparent'}`}>
                             {audioLevel > 0.01 && <Mic size={14} className="animate-pulse" />}
                             <span className="text-xs font-bold tracking-[0.2em] uppercase transition-all">
                                {audioLevel > 0.01 ? "Receiving Audio" : "Listening..."}
                             </span>
                        </div>
                    )}
                </div>

                {/* THE CORE (Visualizer) */}
                <div className="relative w-64 h-64 flex items-center justify-center">
                    {/* Outer Glows */}
                    <div className={`absolute inset-0 rounded-full bg-indigo-500/20 blur-[80px] transition-all duration-300 ${isSpeaking ? 'scale-150 opacity-100' : 'scale-100 opacity-40'}`} />
                    <div className={`absolute inset-0 rounded-full bg-emerald-500/10 blur-[60px] transition-all duration-300 ${audioLevel > 0.05 ? 'scale-125 opacity-100' : 'scale-50 opacity-0'}`} />

                    {/* Rings */}
                    <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-[spin_10s_linear_infinite]" />
                    <div className="absolute inset-4 rounded-full border border-purple-500/20 animate-[spin_8s_linear_infinite_reverse]" />
                    
                    {/* Reactive Circle */}
                    <div 
                        className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center transition-all duration-75 ease-out shadow-2xl
                            ${isSpeaking 
                                ? 'bg-gradient-to-br from-indigo-500 to-purple-700 shadow-[0_0_50px_rgba(99,102,241,0.5)]' 
                                : (audioLevel > 0.05 ? 'bg-gradient-to-br from-emerald-500 to-teal-700 shadow-[0_0_40px_rgba(16,185,129,0.4)]' : 'bg-slate-900 border border-slate-700')}
                        `}
                        style={{
                            transform: `scale(${1 + Math.max(audioLevel, isSpeaking ? 0.2 : 0)})`
                        }}
                    >
                         {status === 'connecting' ? (
                             <Loader2 size={40} className="text-indigo-400 animate-spin" />
                         ) : isPaused ? (
                             <Pause size={48} className="text-slate-500" />
                         ) : isSpeaking ? (
                             <div className="flex gap-1 h-8 items-center">
                                 <div className="w-1 bg-white rounded-full h-full animate-[bounce_1s_infinite]" />
                                 <div className="w-1 bg-white rounded-full h-2/3 animate-[bounce_1.2s_infinite]" />
                                 <div className="w-1 bg-white rounded-full h-full animate-[bounce_0.8s_infinite]" />
                             </div>
                         ) : (
                             <Mic size={40} className={`transition-all ${audioLevel > 0.05 ? 'text-white' : 'text-slate-600'}`} />
                         )}
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-8 flex justify-center items-center gap-6 z-20 pb-12">
                 <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-full border transition-all duration-200 hover:scale-110 ${isMuted ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                 >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                 </button>

                 <button 
                    onClick={toggleScreenShare}
                    className={`p-4 rounded-full border transition-all duration-200 hover:scale-110 ${isScreenSharing ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen with Riya"}
                 >
                    {isScreenSharing ? <StopCircle size={24} /> : <Monitor size={24} />}
                 </button>

                 <button 
                    onClick={endCall}
                    className="px-8 py-4 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:scale-105 transition-all flex items-center gap-3"
                 >
                    <PhoneOff size={24} fill="currentColor" />
                    <span>Disconnect</span>
                 </button>

                 <button 
                    onClick={togglePause}
                    className={`p-4 rounded-full border transition-all duration-200 hover:scale-110 ${isPaused ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                 >
                    {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                 </button>
            </div>
        </div>

        {/* === Right Side: Intelligent Transcript === */}
        <div className={`
            absolute lg:relative inset-y-0 right-0 w-full lg:w-[35%] bg-slate-950/80 backdrop-blur-2xl border-l border-white/10 transform transition-transform duration-300 z-30 flex flex-col shadow-2xl
            ${showChat ? 'translate-x-0' : 'translate-x-full lg:hidden'}
        `}>
            {/* Chat Header */}
            <div className="p-5 border-b border-white/10 bg-slate-900/50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-white flex items-center gap-2"><Zap size={16} className="text-yellow-500 fill-yellow-500"/> Live Transcript</h3>
                    <p className="text-[10px] text-slate-500 font-mono">ENCRYPTED // REAL-TIME</p>
                </div>
                <div className="flex gap-2">
                     <button onClick={() => setShowChat(false)} className="hidden lg:block p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"><Maximize2 size={18}/></button>
                     <button onClick={() => setShowChat(false)} className="lg:hidden p-2 text-slate-400 hover:text-white"><X size={20}/></button>
                </div>
            </div>

            {/* Chat Content */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                {transcript.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-50">
                        <Signal size={48} className="animate-pulse" />
                        <p className="text-sm font-mono text-center">
                            WAITING FOR AUDIO STREAM...<br/>
                            {!transcriptionEnabledRef.current && <span className="text-xs opacity-70 text-amber-400">(Audio Only Mode)</span>}
                        </p>
                    </div>
                ) : (
                    transcript.map(item => (
                        <div key={item.id} className={`flex gap-3 animate-in slide-in-from-bottom-2 duration-300 ${item.role === 'user' ? 'flex-row-reverse' : ''}`}>
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 border border-slate-700 text-indigo-400'}`}>
                                 {item.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                             </div>
                             
                             <div className={`flex flex-col max-w-[80%] ${item.role === 'user' ? 'items-end' : 'items-start'}`}>
                                 <div className={`
                                    px-4 py-3 rounded-2xl text-sm leading-relaxed border relative
                                    ${item.role === 'user' 
                                        ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-100 rounded-tr-none' 
                                        : 'bg-slate-900 border-slate-800 text-slate-300 rounded-tl-none'}
                                    ${item.isPartial ? 'opacity-70 border-dashed' : 'opacity-100 shadow-md'}
                                 `}>
                                     {item.text}
                                     {item.isPartial && <span className="inline-block w-1.5 h-3 ml-1 bg-current animate-pulse align-middle" />}
                                 </div>
                                 {!item.isPartial && (
                                     <span className="text-[10px] text-slate-600 mt-1 font-mono px-1">
                                         {new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                                     </span>
                                 )}
                             </div>
                        </div>
                    ))
                )}
                <div className="h-4" /> {/* Spacer */}
            </div>
            
            {/* Status Footer */}
            <div className="p-3 border-t border-white/5 bg-slate-900/80 text-center">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                     <div className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                         AI Latency: {status === 'connected' ? 'Low' : 'N/A'}
                     </span>
                 </div>
            </div>
        </div>

    </div>
  );
};
