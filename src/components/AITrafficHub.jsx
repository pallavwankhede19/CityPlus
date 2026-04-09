import { AlertTriangle, WifiOff, Zap, TrendingDown, Brain } from 'lucide-react';
import { motion } from 'motion/react';

export function AITrafficHub() {
  return (
    <div className="space-y-8">
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
              <span className="font-bold text-sm">Congestion Spike: MG Road</span>
              <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Congestion: High</span>
            </div>
          </div>
          <span className="text-xs font-bold bg-secondary/10 px-3 py-1 rounded-full text-secondary">WARNING</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3 space-y-8">
          <div className="bg-on-surface rounded-3xl overflow-hidden shadow-2xl relative h-[500px]">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            <img 
              alt="City Traffic Grid" 
              className="w-full h-full object-cover mix-blend-luminosity opacity-40" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDJ-BLiZ8aFfdUUfZsAYutQwG33d5BEqVrarPSt7Sp2zhLigyVL86wXE8oAt6ZdMcXpBuDUZuTiqKW9_UY8exz0YHjwwZjvVCm19S979knm5CZJz53atAbzkP8VYY6WGUrK4ZLjSjMUi-jPzePHpvlESGoqZs9fpm-ATqJjuYUvXvQF3FOLji8ua2WL3Y2Dv0A3gfL4pyQgE59INa7fADPepi8IDZUGfRpg9rm01v1qGw-CjSyqe4zL2DEaMA2jIltddnsxu7P64J0"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 p-12">
              <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-error rounded-full shadow-[0_0_15px_rgba(186,26,26,1)] animate-pulse"></div>
              <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-secondary-fixed-dim rounded-full shadow-[0_0_15px_rgba(239,192,87,1)] animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-4 h-4 bg-primary-fixed-dim rounded-full shadow-[0_0_15px_rgba(161,209,191,1)] animate-pulse"></div>
              <div className="absolute bottom-1/3 left-1/4 w-3 h-3 bg-primary-fixed-dim rounded-full opacity-60"></div>
            </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/20">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-on-surface font-bold text-sm tracking-tight">Peak Hour Prediction</h3>
                <span className="text-primary text-[10px] font-bold bg-primary-fixed px-2 py-1 rounded">LIVE AI MODEL</span>
              </div>
              <div className="h-32 flex items-end gap-2">
                <motion.div initial={{ height: 0 }} animate={{ height: '40%' }} className="w-full bg-surface-container-high rounded-t-lg"></motion.div>
                <motion.div initial={{ height: 0 }} animate={{ height: '60%' }} className="w-full bg-surface-container-high rounded-t-lg"></motion.div>
                <motion.div initial={{ height: 0 }} animate={{ height: '90%' }} className="w-full bg-primary rounded-t-lg"></motion.div>
                <motion.div initial={{ height: 0 }} animate={{ height: '85%' }} className="w-full bg-primary-container rounded-t-lg"></motion.div>
                <motion.div initial={{ height: 0 }} animate={{ height: '50%' }} className="w-full bg-surface-container-high rounded-t-lg"></motion.div>
                <motion.div initial={{ height: 0 }} animate={{ height: '30%' }} className="w-full bg-surface-container-high rounded-t-lg"></motion.div>
              </div>
              <div className="flex justify-between mt-4 text-[10px] font-bold text-on-surface-variant opacity-60">
                <span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span>
              </div>
            </div>
            <div className="bg-primary text-white p-6 rounded-3xl flex flex-col justify-between shadow-xl">
              <span className="text-[10px] font-extrabold tracking-widest opacity-60 uppercase">Avg Wait Time</span>
              <div className="space-y-1">
                <p className="text-4xl font-extrabold">42<span className="text-lg opacity-60 ml-1">sec</span></p>
                <p className="text-[10px] text-secondary-fixed-dim font-bold flex items-center gap-1">
                  <TrendingDown size={12} />
                  -12% from baseline
                </p>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm md:col-span-3 border border-outline-variant/20">
              <h3 className="text-on-surface font-bold text-sm mb-4">Worst Performing Signals</h3>
              <div className="space-y-3">
                {[
                  { id: '01', name: 'Phoenix Mall Junction', delay: '98s Delay', color: 'text-error' },
                  { id: '02', name: 'Marine Drive North', delay: '74s Delay', color: 'text-secondary' },
                  { id: '03', name: 'Worli Interchange', delay: '62s Delay', color: 'text-on-surface-variant' },
                ].map((signal) => (
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

        <div className="lg:w-1/3 space-y-6">
          <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-xl border border-surface-container-highest">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-3 h-3 bg-primary rounded-full animate-ping"></div>
              <h2 className="text-lg font-bold tracking-tight text-on-surface">AI Control Panel</h2>
            </div>
            <div className="mb-10 text-center">
              <div className="inline-flex items-center justify-center p-12 rounded-full border-[12px] border-surface-container mb-4">
                <div className="text-center">
                  <span className="block text-4xl font-extrabold text-primary">60</span>
                  <span className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase">Seconds Left</span>
                </div>
              </div>
              <p className="text-xs font-bold text-on-surface-variant">Current Cycle: <span className="text-primary">Optimized</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-surface-container p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-on-surface-variant opacity-60 mb-1">CURRENT TIMING</p>
                <p className="text-2xl font-black text-on-surface">60s</p>
              </div>
              <div className="bg-primary-container p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-on-primary-container opacity-80 mb-1">AI PROPOSAL</p>
                <p className="text-2xl font-black text-white">45s</p>
              </div>
            </div>
            <div className="bg-secondary-container/20 p-6 rounded-3xl mb-10 border border-secondary/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-secondary tracking-widest uppercase">AI IMPACT</p>
                <p className="text-xl font-extrabold text-on-secondary-container">18% Efficiency Lift</p>
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
              Rainfall predicted in <span className="font-bold text-primary">20 mins</span>. Suggesting +15% buffer at Junction 04 & 09 to prevent gridlock.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
