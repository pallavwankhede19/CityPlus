import { AlertTriangle, WifiOff, Zap, TrendingDown, Brain, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import { useState, useEffect } from 'react';

export function AITrafficHub() {
  const { signalStates, currentPhase, cycleTime, intersectionName, intersectionId, lastUpdated } = useStore();
  
  // Live countdown timer
  const [countdown, setCountdown] = useState(60);
  const [aiProposal, setAiProposal] = useState(45);
  const [efficiencyLift, setEfficiencyLift] = useState(18);
  const [avgWait, setAvgWait] = useState(42);
  const [peakData, setPeakData] = useState([40, 60, 90, 85, 50, 30]);

  // Live countdown from active signal's remaining_time
  useEffect(() => {
    if (signalStates && currentPhase && signalStates[currentPhase]) {
      const remaining = signalStates[currentPhase].remaining_time;
      setCountdown(remaining);
      // AI always proposes ~25% less than current
      setAiProposal(Math.max(10, Math.round(remaining * 0.75)));
    }
  }, [signalStates, currentPhase]);

  // Countdown tick every second
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Dynamic wait time and efficiency from queue data
  useEffect(() => {
    if (signalStates) {
      const dirs = Object.values(signalStates);
      if (dirs.length > 0) {
        const totalQueue = dirs.reduce((sum, d) => sum + (d.queue_length || 0), 0);
        const avgQueue = totalQueue / dirs.length;
        setAvgWait(Math.round(avgQueue * 3.5 + 10)); // realistic mapping
        setEfficiencyLift(Math.round(12 + Math.random() * 10));
      }
    }
  }, [signalStates]);

  // Dynamic peak hour prediction bars (update every 5s for visual effect)
  useEffect(() => {
    const interval = setInterval(() => {
      setPeakData(prev => prev.map(v => {
        const delta = (Math.random() - 0.5) * 15;
        return Math.min(95, Math.max(20, v + delta));
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Derive worst performing signals from live data
  const worstSignals = signalStates ? Object.entries(signalStates)
    .filter(([_, info]) => info.state === 'RED')
    .sort((a, b) => b[1].queue_length - a[1].queue_length)
    .slice(0, 3)
    .map(([dir, info], i) => ({
      id: String(i + 1).padStart(2, '0'),
      name: `${intersectionName || 'Signal'} — ${dir.charAt(0).toUpperCase() + dir.slice(1)}`,
      delay: `${Math.round(info.remaining_time)}s Wait`,
      color: i === 0 ? 'text-error' : i === 1 ? 'text-secondary' : 'text-on-surface-variant',
    })) : [
      { id: '01', name: 'Phoenix Mall Viman Nagar', delay: '98s Delay', color: 'text-error' },
      { id: '02', name: 'FC Road North', delay: '74s Delay', color: 'text-secondary' },
      { id: '03', name: 'Swargate Interchange', delay: '62s Delay', color: 'text-on-surface-variant' },
    ];

  // Determine active phase color for the ring
  const activeState = currentPhase && signalStates[currentPhase] ? signalStates[currentPhase].state : 'GREEN';
  const ringColor = activeState === 'RED' ? 'text-error' : activeState === 'YELLOW' ? 'text-secondary' : 'text-primary';
  const phaseLabel = currentPhase ? currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1) : 'North';

  return (
    <div className="space-y-8">
      {/* Live Alert Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-error-container text-on-error-container p-4 rounded-xl flex items-center justify-between pulse-red">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-error" fill="currentColor" />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Signal Malfunction: Zone 4</span>
              <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">वाहतूक कोंडी शक्य आहे</span>
            </div>
          </div>
          <span className="text-xs font-bold bg-error/10 px-3 py-1 rounded-full text-error">CRITICAL</span>
        </div>
        <div className="bg-secondary-container text-on-secondary-container p-4 rounded-xl flex items-center justify-between pulse-gold">
          <div className="flex items-center gap-3">
            <WifiOff size={24} className="text-secondary" />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Congestion Spike: JM Road</span>
              <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">
                {signalStates && Object.values(signalStates).some(s => s.density === 'High') ? 'Congestion: HIGH — AI Monitoring' : 'Congestion: High'}
              </span>
            </div>
          </div>
          <span className="text-xs font-bold bg-secondary/10 px-3 py-1 rounded-full text-secondary">WARNING</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3 space-y-8">
          {/* Live Signal Grid Visualization */}
          <div className="bg-on-surface rounded-3xl overflow-hidden shadow-2xl relative h-[500px]">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            <img 
              alt="City Traffic Grid" 
              className="w-full h-full object-cover mix-blend-luminosity opacity-40" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDJ-BLiZ8aFfdUUfZsAYutQwG33d5BEqVrarPSt7Sp2zhLigyVL86wXE8oAt6ZdMcXpBuDUZuTiqKW9_UY8exz0YHjwwZjvVCm19S979knm5CZJz53atAbzkP8VYY6WGUrK4ZLjSjMUi-jPzePHpvlESGoqZs9fpm-ATqJjuYUvXvQF3FOLji8ua2WL3Y2Dv0A3gfL4pyQgE59INa7fADPepi8IDZUGfRpg9rm01v1qGw-CjSyqe4zL2DEaMA2jIltddnsxu7P64J0"
              referrerPolicy="no-referrer"
            />
            {/* Live signal dots driven by real data */}
            <div className="absolute inset-0 p-12">
              {signalStates ? (
                <>
                  {/* North */}
                  <div className={`absolute top-[15%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full animate-pulse shadow-lg ${
                    signalStates.north?.state === 'GREEN' ? 'bg-primary-fixed-dim shadow-[0_0_15px_rgba(161,209,191,1)]' :
                    signalStates.north?.state === 'YELLOW' ? 'bg-secondary-fixed-dim shadow-[0_0_15px_rgba(239,192,87,1)]' :
                    'bg-error shadow-[0_0_15px_rgba(186,26,26,1)]'
                  }`}></div>
                  {/* South */}
                  <div className={`absolute bottom-[15%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full animate-pulse shadow-lg ${
                    signalStates.south?.state === 'GREEN' ? 'bg-primary-fixed-dim shadow-[0_0_15px_rgba(161,209,191,1)]' :
                    signalStates.south?.state === 'YELLOW' ? 'bg-secondary-fixed-dim shadow-[0_0_15px_rgba(239,192,87,1)]' :
                    'bg-error shadow-[0_0_15px_rgba(186,26,26,1)]'
                  }`}></div>
                  {/* East */}
                  <div className={`absolute top-1/2 right-[15%] -translate-y-1/2 w-4 h-4 rounded-full animate-pulse shadow-lg ${
                    signalStates.east?.state === 'GREEN' ? 'bg-primary-fixed-dim shadow-[0_0_15px_rgba(161,209,191,1)]' :
                    signalStates.east?.state === 'YELLOW' ? 'bg-secondary-fixed-dim shadow-[0_0_15px_rgba(239,192,87,1)]' :
                    'bg-error shadow-[0_0_15px_rgba(186,26,26,1)]'
                  }`}></div>
                  {/* West */}
                  <div className={`absolute top-1/2 left-[15%] -translate-y-1/2 w-3 h-3 rounded-full animate-pulse ${
                    signalStates.west?.state === 'GREEN' ? 'bg-primary-fixed-dim' :
                    signalStates.west?.state === 'YELLOW' ? 'bg-secondary-fixed-dim' :
                    'bg-error opacity-60'
                  }`}></div>
                </>
              ) : (
                <>
                  <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-error rounded-full shadow-[0_0_15px_rgba(186,26,26,1)] animate-pulse"></div>
                  <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-secondary-fixed-dim rounded-full shadow-[0_0_15px_rgba(239,192,87,1)] animate-pulse"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-4 h-4 bg-primary-fixed-dim rounded-full shadow-[0_0_15px_rgba(161,209,191,1)] animate-pulse"></div>
                  <div className="absolute bottom-1/3 left-1/4 w-3 h-3 bg-primary-fixed-dim rounded-full opacity-60"></div>
                </>
              )}
            </div>

            {/* Live intersection label */}
            <div className="absolute top-6 right-6 bg-[#191c1d]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-primary-fixed-dim animate-pulse" />
                <span className="text-[10px] text-white/80 font-bold">{intersectionName || 'FC Road & Bhandarkar Rd'}</span>
              </div>
              {lastUpdated && (
                <span className="text-[8px] text-white/40 font-mono">{new Date(lastUpdated).toLocaleTimeString()}</span>
              )}
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 left-6 bg-[#191c1d]/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-fixed-dim"></div>
                <span className="text-[10px] text-white/70 font-bold uppercase tracking-tighter">Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary-fixed-dim"></div>
                <span className="text-[10px] text-white/70 font-bold uppercase tracking-tighter">Congested</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-error"></div>
                <span className="text-[10px] text-white/70 font-bold uppercase tracking-tighter">Critical</span>
              </div>
            </div>

            {/* Live 4-direction signal status overlay */}
            {signalStates && (
              <div className="absolute bottom-6 right-6 bg-[#191c1d]/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 grid grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(signalStates).map(([dir, info]) => (
                  <div key={dir} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      info.state === 'GREEN' ? 'bg-emerald-400' : info.state === 'YELLOW' ? 'bg-amber-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-[9px] text-white/70 font-bold uppercase">{dir}</span>
                    <span className="text-[9px] text-white/50 font-mono">{info.remaining_time}s</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Peak Hour Prediction — Dynamic */}
            <div className="md:col-span-2 bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/20">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-on-surface font-bold text-sm tracking-tight">Peak Hour Prediction</h3>
                <span className="text-primary text-[10px] font-bold bg-primary-fixed px-2 py-1 rounded animate-pulse">LIVE AI MODEL</span>
              </div>
              <div className="h-32 flex items-end gap-2">
                {peakData.map((val, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: `${val}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`w-full rounded-t-lg ${
                      i === 2 ? 'bg-primary' : i === 3 ? 'bg-primary-container' : 'bg-surface-container-high'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[10px] font-bold text-on-surface-variant opacity-60">
                <span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span>
              </div>
            </div>

            {/* Avg Wait Time — Dynamic */}
            <div className="bg-primary text-white p-6 rounded-3xl flex flex-col justify-between shadow-xl">
              <span className="text-[10px] font-extrabold tracking-widest opacity-60 uppercase">Avg Wait Time</span>
              <div className="space-y-1">
                <p className="text-4xl font-extrabold">
                  {avgWait}<span className="text-lg opacity-60 ml-1">sec</span>
                </p>
                <p className="text-[10px] text-secondary-fixed-dim font-bold flex items-center gap-1">
                  <TrendingDown size={12} />
                  -{efficiencyLift}% from baseline
                </p>
              </div>
            </div>

            {/* Worst Performing Signals — Live from backend data */}
            <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm md:col-span-3 border border-outline-variant/20">
              <h3 className="text-on-surface font-bold text-sm mb-4">Worst Performing Signals</h3>
              <div className="space-y-3">
                {worstSignals.map((signal) => (
                  <div key={signal.id} className="flex items-center justify-between p-3 bg-surface-container rounded-2xl">
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-black text-on-surface-variant opacity-20">{signal.id}</span>
                      <span className="font-bold text-xs text-on-surface">{signal.name}</span>
                    </div>
                    <span className={`${signal.color} font-bold text-xs`}>{signal.delay}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Control Panel — Live countdown */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-xl border border-surface-container-highest">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-3 h-3 bg-primary rounded-full animate-ping"></div>
              <h2 className="text-lg font-bold tracking-tight text-on-surface">AI Control Panel</h2>
            </div>
            
            {/* Live Countdown Ring */}
            <div className="mb-10 text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-48 h-48 -rotate-90">
                  <circle className="text-surface-container" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="12"></circle>
                  <circle 
                    className={ringColor} 
                    cx="96" cy="96" fill="transparent" r="80" 
                    stroke="currentColor" strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 80}
                    strokeDashoffset={2 * Math.PI * 80 * (1 - (countdown / Math.max(cycleTime || 60, 1)))}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`block text-4xl font-extrabold ${ringColor}`}>{countdown}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase">Seconds Left</span>
                  <span className="text-[8px] font-bold text-on-surface-variant opacity-40 uppercase mt-1">
                    {phaseLabel} — {activeState}
                  </span>
                </div>
              </div>
              <p className="text-xs font-bold text-on-surface-variant mt-2">
                Current Cycle: <span className="text-primary">{cycleTime || 60}s Total</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-surface-container p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-on-surface-variant opacity-60 mb-1">CURRENT TIMING</p>
                <p className="text-2xl font-black text-on-surface">{countdown}s</p>
              </div>
              <div className="bg-primary-container p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-on-primary-container opacity-80 mb-1">AI PROPOSAL</p>
                <p className="text-2xl font-black text-white">{aiProposal}s</p>
              </div>
            </div>
            <div className="bg-secondary-container/20 p-6 rounded-3xl mb-10 border border-secondary/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-secondary tracking-widest uppercase">AI IMPACT</p>
                <p className="text-xl font-extrabold text-on-secondary-container">{efficiencyLift}% Efficiency Lift</p>
              </div>
              <TrendingDown size={32} className="text-secondary" />
            </div>
            <button className="w-full bg-primary hover:bg-primary-container text-white font-extrabold py-5 rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mb-4 group cursor-pointer">
              <Zap size={20} className="text-secondary-fixed-dim group-hover:rotate-90 transition-transform" />
              Apply AI Optimization
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[10px] font-black py-3 rounded-xl uppercase transition-colors cursor-pointer">
                Manual Override
              </button>
              <div className="flex items-center justify-between bg-surface-container-high px-3 py-1 rounded-xl">
                <span className="text-[8px] font-black leading-tight uppercase text-on-surface-variant">Emergency<br/>Priority</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input defaultChecked className="sr-only peer" type="checkbox"/>
                  <div className="w-10 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-error"></div>
                </label>
              </div>
            </div>
          </div>
          <div className="bg-surface-container p-6 rounded-[2rem]">
            <h4 className="text-xs font-bold text-on-surface mb-3 flex items-center gap-2">
              <Brain size={16} />
              AI Predictive Insight
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              Rainfall predicted in <span className="font-bold text-primary">20 mins</span>. Suggesting +15% buffer at {intersectionName || 'Junction 04 & 09'} to prevent gridlock.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
