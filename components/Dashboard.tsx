
import React, { useState, useEffect } from 'react';
import { UserStats, AppView } from '../types';
import { BookOpen, Brain, Calendar, Zap, Award, Clock, ChevronRight, Sparkles, Users, Trophy, Flame, Quote } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DashboardProps {
  stats: UserStats;
  onChangeView: (view: AppView) => void;
}

const QUOTES = [
  "Sapne wo nahi jo hum sote hue dekhte hain, sapne wo hain jo humein sone nahi dete. – APJ Abdul Kalam",
  "Mehnat itni khamoshi se karo ki safalta shor macha de.",
  "Your future is created by what you do today, not tomorrow.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Believe you can and you're halfway there.",
  "Topper wo nahi jo sab jaanta hai, Topper wo hai jo kabhi haar nahi maanta.",
  "Padhai boring ho sakti hai, par result hamesha interesting hota hai!"
];

export const Dashboard: React.FC<DashboardProps> = ({ stats, onChangeView }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveStats, setLiveStats] = useState(stats);
  const [onlineUsers, setOnlineUsers] = useState(1238);
  const [dailyQuote, setDailyQuote] = useState(QUOTES[0]);

  // Sync props to state if props change
  useEffect(() => {
    setLiveStats(stats);
  }, [stats]);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Pick random quote once on mount
  useEffect(() => {
    const random = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setDailyQuote(random);
  }, []);

  // Simulate live study time (incrementing decimals to look "real")
  useEffect(() => {
    const interval = setInterval(() => {
        setLiveStats(prev => ({
            ...prev,
            totalStudyHours: prev.totalStudyHours + (0.0002777) // approx 1 sec in hours
        }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate fluctuating online users
  useEffect(() => {
      const interval = setInterval(() => {
          setOnlineUsers(prev => {
              const change = Math.floor(Math.random() * 5) - 2;
              return prev + change;
          });
      }, 3000);
      return () => clearInterval(interval);
  }, []);

  const data = [
    { name: 'Mon', hours: 2.5 },
    { name: 'Tue', hours: 3.8 },
    { name: 'Wed', hours: 1.5 },
    { name: 'Thu', hours: 4.0 },
    { name: 'Fri', hours: 3.2 },
    { name: 'Sat', hours: 5.5 },
    { name: 'Sun', hours: 2.0 },
  ];

  // Date formatting to match screenshot: "Sunday, February 8 | 11:46:58 AM"
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateString = currentTime.toLocaleDateString('en-US', dateOptions);
  const timeString = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* 1. Header Section */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center gap-3">
            Welcome back, Topper! 
            <Trophy className="text-yellow-500 fill-yellow-500" size={32} />
          </h1>
          <p className="text-slate-500 mt-2 flex flex-wrap items-center gap-3 text-sm md:text-base font-medium">
             <Clock size={18} className="text-indigo-500"/> 
             <span>{dateString}</span>
             <span className="text-slate-300">|</span>
             <span className="font-mono text-slate-700 min-w-[100px]">{timeString}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
             {/* BSEB Students Card */}
             <div className="flex-1 lg:flex-none flex items-center gap-4 bg-emerald-50/50 px-6 py-4 rounded-2xl border border-emerald-100 min-w-[200px]">
                <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">BSEB Students</p>
                  <p className="text-2xl font-black text-slate-900">{onlineUsers.toLocaleString()}</p>
                </div>
            </div>

            {/* Streak Card */}
            <div className="flex-1 lg:flex-none flex items-center gap-4 bg-orange-50/50 px-6 py-4 rounded-2xl border border-orange-100 min-w-[180px]">
                <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                  <Zap size={24} fill="currentColor" />
                </div>
                <div>
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-wider">Streak</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black text-slate-900">{stats.streak} Days</p>
                    <Flame size={20} className="text-orange-500 fill-orange-500 animate-pulse" />
                  </div>
                </div>
            </div>
        </div>
      </div>

      {/* NEW: Daily Wisdom Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-100 rounded-[1.5rem] p-5 flex items-center gap-4 shadow-sm relative overflow-hidden">
         <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Quote size={100} className="text-orange-400 rotate-12 -mr-4 -mt-4" />
         </div>
         <div className="bg-white p-3 rounded-full shadow-sm text-orange-500 shrink-0">
             <Sparkles size={24} fill="currentColor" />
         </div>
         <div className="relative z-10">
             <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">Daily Wisdom</p>
             <p className="text-slate-800 font-medium italic text-lg">"{dailyQuote}"</p>
         </div>
      </div>

      {/* 2. Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Study Time */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <BookOpen size={28} />
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span> Tracking Live
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-semibold mb-1">Total Study Time</p>
            <h3 className="text-4xl font-bold text-slate-900 tracking-tight font-mono">
                {liveStats.totalStudyHours.toFixed(4)} <span className="text-lg text-slate-400 font-sans font-medium">hrs</span>
            </h3>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-6">
            <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000" style={{ width: '65%' }}></div>
          </div>
        </div>

        {/* Objective Qs */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Brain size={28} />
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                +12 today
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-semibold mb-1">Objective Qs Solved</p>
            <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                {liveStats.questionsSolved}
            </h3>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-6">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Award size={28} />
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                Top 10%
            </span>
          </div>
          <div>
             <p className="text-slate-500 text-sm font-semibold mb-1">Accuracy</p>
             <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                {stats.accuracy}%
             </h3>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-6">
            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${stats.accuracy}%` }}></div>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions & Analytics */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Sparkles className="text-amber-500 fill-amber-500" size={20}/> Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ask Riya (Updated) Banner */}
            <div className="lg:col-span-2">
                <button 
                    onClick={() => onChangeView(AppView.TUTOR)}
                    className="w-full h-full min-h-[200px] relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 text-white shadow-xl shadow-indigo-200 hover:shadow-2xl hover:scale-[1.01] transition-all group text-left p-8 flex flex-col justify-center"
                >
                    {/* Background decoration */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none">
                        <Brain size={300} className="absolute right-[-50px] top-1/2 -translate-y-1/2 rotate-12" />
                    </div>
                    
                    <div className="relative z-10 max-w-lg">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 text-white">
                            <Brain size={32} />
                        </div>
                        <h3 className="text-3xl font-bold mb-2">Ask Riya</h3>
                        <p className="text-indigo-100 text-lg mb-6 opacity-90">Instant doubts solving & explanations from your study buddy.</p>
                        
                        <div className="inline-flex items-center gap-2 bg-white text-indigo-700 px-5 py-2.5 rounded-full font-bold text-sm hover:bg-indigo-50 transition-colors">
                            Start Chat <ChevronRight size={16} />
                        </div>
                    </div>
                </button>
            </div>

            {/* Side Actions */}
            <div className="flex flex-col gap-4">
                <button 
                    onClick={() => onChangeView(AppView.QUIZ)}
                    className="flex-1 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all group text-left flex items-center gap-4"
                >
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Zap size={28} fill="currentColor" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg">MCQ Test</h4>
                        <p className="text-sm text-slate-500">Practice Objective Qs</p>
                    </div>
                </button>

                <button 
                    onClick={() => onChangeView(AppView.PLANNER)}
                    className="flex-1 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group text-left flex items-center gap-4"
                >
                    <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Calendar size={28} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg">Study Planner</h4>
                        <p className="text-sm text-slate-500">Manage your schedule</p>
                    </div>
                </button>
            </div>
        </div>
      </div>
      
       {/* Analytics Chart */}
       <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
                <h2 className="text-xl font-bold text-slate-800">Study Analytics</h2>
                <p className="text-sm text-slate-400 font-medium">Your learning consistency over the week</p>
            </div>
            <select className="bg-slate-50 border-none text-sm text-slate-600 font-bold rounded-xl px-4 py-2 hover:bg-slate-100 cursor-pointer focus:ring-0">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px 16px', fontFamily: 'sans-serif' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                />
                <Bar dataKey="hours" fill="#6366f1" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

    </div>
  );
};
