import { TrafficSignalCard } from '../components/TrafficSignalCard';
import { MapCard } from '../components/MapCard';
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export function Dashboard() {
  const { signalStates, currentPhase, cycleTime, intersectionName, intersectionId, lastUpdated } = useStore();
  const [timeRange, setTimeRange] = useState('7 Days');
  const [uptime, setUptime] = useState(99.98);
  const [liveVehicles, setLiveVehicles] = useState(1847);
  const [incidents, setIncidents] = useState(3);

  const data7Days = [42, 65, 85, 55, 70, 95, 45];
  const data30Days = [60, 45, 75, 80, 50, 85, 65, 42, 78, 55, 90, 48, 67, 82, 58, 73, 88, 52, 69, 77, 63, 91, 44, 56, 84, 61, 72, 86, 50, 79];
  
  const currentData = timeRange === '7 Days' ? data7Days : data30Days;
  const labels7 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const labels30 = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
  const currentLabels = timeRange === '7 Days' ? labels7 : labels30;

  // Dynamic network health uptime
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setUptime(prev => {
        const newValue = prev + (Math.random() * 0.04 - 0.02);
        return Math.min(100, Math.max(99.00, newValue));
      });
    }, 3100);
    return () => clearInterval(updateInterval);
  }, []);

  // Live vehicle count ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setLiveVehicles(prev => prev + Math.floor(Math.random() * 5) - 2);
      setIncidents(prev => Math.random() > 0.95 ? prev + 1 : prev);
    }, 2000);
    return () => clearInterval(tick);
  }, []);

  // Compute live stats from backend signal data
  const totalQueueLength = signalStates 
    ? Object.values(signalStates).reduce((sum, s) => sum + (s.queue_length || 0), 0) 
    : 0;
  const avgDensity = signalStates 
    ? Object.values(signalStates).map(s => s.density === 'High' ? 3 : s.density === 'Medium' ? 2 : 1).reduce((a, b) => a + b, 0) / Object.values(signalStates).length 
    : 0;
  const overallDensity = avgDensity > 2.5 ? 'CRITICAL' : avgDensity > 1.5 ? 'MODERATE' : 'OPTIMAL';
  const densityColor = avgDensity > 2.5 ? 'text-red-600 bg-red-50' : avgDensity > 1.5 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full flex-1">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 mt-2">
        <div className="max-w-2xl">
          <span className="inline-block px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-bold uppercase tracking-widest rounded-full mb-4 animate-pulse">Real-time Pulse</span>
          <h1 className="text-4xl md:text-[2.75rem] font-extrabold text-primary leading-tight tracking-tight">
              Pune Operations Dashboard
          </h1>
          <p className="text-on-surface-variant text-base max-w-lg mt-2">
              Overseeing the rhythmic flow of infrastructure, citizen engagement, and digital connectivity across the urban landscape.
          </p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 whitespace-nowrap">
          <span className="material-symbols-outlined">auto_awesome</span>
          Generate Intelligence Report
        </button>
      </section>

      {/* Metric Cards */}
      <TrafficSignalCard />

      {/* Live Intersection Status Strip */}
      {signalStates && (
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-emerald-900/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 className="text-sm font-bold text-primary">Live Intersection — {intersectionName || intersectionId}</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${densityColor}`}>{overallDensity}</span>
              {lastUpdated && (
                <span className="text-[10px] text-slate-400 font-mono">{new Date(lastUpdated).toLocaleTimeString()}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(signalStates).map(([dir, info]) => (
              <div key={dir} className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                info.state === 'GREEN' ? 'border-emerald-400 bg-emerald-50/50' :
                info.state === 'YELLOW' ? 'border-amber-400 bg-amber-50/50' :
                'border-red-200 bg-red-50/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-on-surface-variant">{dir}</span>
                  <div className={`w-3 h-3 rounded-full ${
                    info.state === 'GREEN' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                    info.state === 'YELLOW' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                    'bg-red-500'
                  }`}></div>
                </div>
                <p className="text-2xl font-extrabold text-on-surface">{info.remaining_time}<span className="text-sm opacity-50">s</span></p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-slate-500">{info.state}</span>
                  <span className={`text-[10px] font-bold ${
                    info.density === 'High' ? 'text-red-600' : info.density === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                  }`}>Q: {info.queue_length}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Map Section */}
      <MapCard />

      {/* Quick Stats Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-emerald-900/10 flex items-center gap-4">
          <div className="p-3 bg-violet-50 rounded-xl">
            <span className="material-symbols-outlined text-violet-700">directions_car</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Live Vehicles Tracked</p>
            <p className="text-2xl font-extrabold text-primary">{liveVehicles.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-emerald-900/10 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl">
            <span className="material-symbols-outlined text-amber-700">queue</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Total Queue Length</p>
            <p className="text-2xl font-extrabold text-primary">{totalQueueLength} <span className="text-sm text-slate-400">vehicles</span></p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-emerald-900/10 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl">
            <span className="material-symbols-outlined text-red-700">warning</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Active Incidents</p>
            <p className="text-2xl font-extrabold text-primary">{incidents}</p>
          </div>
        </div>
      </section>

      {/* Activity Feed & Analytics Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
        <div className="md:col-span-8 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-emerald-900/10 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-primary">Traffic Velocity Trends</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setTimeRange('7 Days')}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${timeRange === '7 Days' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-700'}`}
              >
                7 Days
              </button>
              <button 
                onClick={() => setTimeRange('30 Days')}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${timeRange === '30 Days' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-700'}`}
              >
                30 Days
              </button>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-1">
            {currentData.map((val, i) => (
              <div 
                key={`${timeRange}-${i}`} 
                className={`flex-1 ${val > 85 ? 'bg-primary' : val > 70 ? 'bg-secondary' : 'bg-emerald-100/30'} rounded-t-lg hover:bg-emerald-200 transition-all duration-700 ease-out cursor-pointer group relative`}
                style={{ height: `${val}%` }}
              >
                <span className={`absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold ${val > 85 ? 'text-primary' : val > 70 ? 'text-amber-700' : 'text-emerald-700'} opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap`}>
                  {val > 85 ? 'Peak' : `${Math.round(val)}%`}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-on-surface-variant opacity-60">
            {currentLabels.map(l => <span key={l}>{l}</span>)}
          </div>
        </div>
        
        <div className="md:col-span-4 bg-emerald-900 p-8 rounded-xl shadow-lg flex flex-col justify-between text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Network Health <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span></h2>
            <p className="text-emerald-100/70 text-sm mb-6">All systems are currently performing within expected operational boundaries.</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-emerald-400">
                <span>Uptime</span>
                <span className="font-mono">{uptime.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-emerald-800 h-1.5 rounded-full overflow-hidden border border-emerald-950 relative">
                <div 
                    className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-in-out relative" 
                    style={{ width: `${uptime}%` }}
                >
                    <div className="absolute inset-0 bg-white/50 animate-pulse"></div>
                </div>
              </div>
              {/* Live cycle info */}
              {cycleTime > 0 && (
                <div className="mt-4 pt-4 border-t border-emerald-800">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-emerald-400">
                    <span>Signal Cycle</span>
                    <span className="font-mono">{cycleTime}s</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-emerald-400 mt-2">
                    <span>Active Phase</span>
                    <span className="font-mono capitalize">{currentPhase || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 bg-emerald-950"></div>
        </div>
      </section>
    </div>
  );
}
