import { useStore } from '../store/useStore';
import clsx from 'clsx';

export function TrafficSignalCard() {
  const { trafficSignal, activeUsersNum, socketConnected } = useStore();

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Active Mobile Users */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm shadow-emerald-900/5 relative overflow-hidden group border border-emerald-900/10">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <span className="material-symbols-outlined text-emerald-700">smartphone</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12.4%</span>
        </div>
        <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Active Mobile Users</h3>
        <p className="text-3xl font-extrabold text-primary mt-1">{activeUsersNum}</p>
        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-9xl">trending_up</span>
        </div>
      </div>

      {/* Live Traffic Signal */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm shadow-emerald-900/5 relative overflow-hidden group border border-emerald-900/10">
        <div className="flex justify-between items-start mb-4">
          <div className={clsx("p-3 rounded-xl", 
            trafficSignal === 'red' ? "bg-red-50" :
            trafficSignal === 'yellow' ? "bg-amber-50" : "bg-emerald-50"
          )}>
            <span className={clsx("material-symbols-outlined", 
              trafficSignal === 'red' ? "text-red-600" :
              trafficSignal === 'yellow' ? "text-amber-600" : "text-emerald-600"
            )}>traffic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx("w-3 h-3 rounded-full",
              trafficSignal === 'red' ? "bg-red-500 pulse-red" :
              trafficSignal === 'yellow' ? "bg-amber-500 pulse-yellow" : "bg-emerald-500 pulse-green"
            )}></span>
            <span className={clsx("text-[10px] font-bold uppercase tracking-widest",
              trafficSignal === 'red' ? "text-red-700" :
              trafficSignal === 'yellow' ? "text-amber-700" : "text-emerald-700"
            )}>Live Sync</span>
          </div>
        </div>
        <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Live Traffic Signal</h3>
        <p className="text-3xl font-extrabold text-primary mt-1 capitalize">{trafficSignal || 'Nominal'}</p>
        <p className="text-[11px] text-slate-400 mt-2 font-medium">98.2% Node Efficiency</p>
      </div>

      {/* Socket Sync Link */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm shadow-emerald-900/5 relative overflow-hidden group border border-emerald-900/10">
        <div className="flex justify-between items-start mb-4">
          <div className={clsx("p-3 rounded-xl", socketConnected ? "bg-emerald-50" : "bg-red-50")}>
            <span className={clsx("material-symbols-outlined", socketConnected ? "text-emerald-700" : "text-red-700")}>hub</span>
          </div>
          <div className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-full", socketConnected ? "bg-emerald-100/50" : "bg-red-100/50")}>
            <span className={clsx("w-2 h-2 rounded-full", socketConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500")}></span>
            <span className={clsx("text-[10px] font-bold uppercase tracking-widest", socketConnected ? "text-emerald-700" : "text-red-700")}>
              {socketConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        <h3 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Socket Sync Link</h3>
        <p className="text-3xl font-extrabold text-primary mt-1">{socketConnected ? '14 ms' : '-- ms'}</p>
        <p className="text-[11px] text-slate-400 mt-2 font-medium">Global Relay Cluster A1</p>
      </div>
    </section>
  );
}
