import { useStore } from '../store/useStore';
import { Zap, TrafficCone, AlertTriangle } from 'lucide-react';

export function TrafficLogs() {
  const { zones, trafficLogs } = useStore();
  
  const getIcon = (type) => {
    switch (type) {
      case 'bolt': return <Zap size={20} />;
      case 'alert': return <AlertTriangle size={20} />;
      case 'traffic': default: return <TrafficCone size={20} />;
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full flex-1">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold tracking-tight text-primary">traffic logs</h1>
        <p className="text-on-surface-variant/70 text-sm">Real-time signal diagnostics and urban mobility audit trail.</p>
      </div>

      {/* Bento Grid - Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 1: Congestion by Zone */}
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-semibold text-primary">Congestion by Zone</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Peak Hours Data</span>
          </div>
          <div className="space-y-6">
            {zones.map((zone) => (
              <div key={zone.name} className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-on-surface-variant">
                  <span>{zone.name}</span>
                  <span>{zone.percentage}%</span>
                </div>
                <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: `${zone.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Signal Efficiency */}
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-primary">Signal Efficiency</h2>
            <span className="material-symbols-outlined text-secondary">bolt</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative py-4">
            <div className="relative flex items-center justify-center">
              <svg className="w-48 h-48 -rotate-90">
                <circle className="text-surface-container-low" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12"></circle>
                <circle className="text-secondary-fixed-dim" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeDasharray="552.9" strokeDashoffset="55.2" strokeWidth="12"></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold text-secondary tracking-tighter">94<span className="text-2xl">%</span></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Network Stability</span>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-8 w-full">
              <div className="text-center">
                <p className="text-xs text-on-surface-variant/60 font-medium">Auto-Adjusts</p>
                <p className="text-lg font-bold text-primary tracking-tight">1,204 / hr</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-on-surface-variant/60 font-medium">Wait Reduction</p>
                <p className="text-lg font-bold text-primary tracking-tight">-12.4%</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Row: Log Feed */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-primary">Log Feed</h2>
            <p className="text-xs text-slate-400 font-medium">Automated Signal Adjustments (Last 60 mins)</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-surface-container-low text-primary text-xs font-bold rounded-lg hover:bg-primary-fixed transition-colors">Export CSV</button>
            <button className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/20">Live View</button>
          </div>
        </div>
        
        <div className="p-8">
          <div className="relative space-y-12">
            {/* Connection Line */}
            <div className="absolute left-[21px] top-4 bottom-4 w-1 bg-[#2d5a4c] opacity-10 rounded-full"></div>
            {trafficLogs.map((log) => (
              <div key={log.id} className="relative flex gap-6 items-start group">
                <div className={`z-10 w-11 h-11 flex items-center justify-center rounded-xl shadow-sm border-2 border-white ${
                  log.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                  log.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {getIcon(log.iconType)}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-primary">{log.title}</h4>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{log.time}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant">{log.desc}</p>
                  <div className="mt-3 flex gap-2">
                    {log.tags.map((tag, tIdx) => (
                      <span key={tIdx} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        log.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        log.color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            
          </div>
        </div>
      </div>
      
    </div>
  );
}
