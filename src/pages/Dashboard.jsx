import { TrafficSignalCard } from '../components/TrafficSignalCard';
import { MapCard } from '../components/MapCard';
import { AITrafficHub } from '../components/AITrafficHub';

export function Dashboard() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full flex-1">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 mt-2">
        <div className="max-w-2xl">
          <span className="inline-block px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">Real-time Pulse</span>
          <h1 className="text-4xl md:text-[2.75rem] font-extrabold text-primary leading-tight tracking-tight">
              Metropolitan Operations Dashboard
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

      {/* Map Section */}
      <MapCard />

      {/* Activity Feed & Analytics Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
        <div className="md:col-span-8 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-emerald-900/10 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-primary">Traffic Velocity Trends</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">7 Days</button>
              <button className="px-4 py-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">30 Days</button>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-4">
            {/* Faux Bar Chart */}
            <div className="flex-1 bg-emerald-100/30 rounded-t-lg h-[40%] hover:bg-emerald-200 transition-colors cursor-pointer group relative">
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">42%</span>
            </div>
            <div className="flex-1 bg-emerald-100/30 rounded-t-lg h-[65%] hover:bg-emerald-200 transition-colors cursor-pointer group relative">
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">65%</span>
            </div>
            <div className="flex-1 bg-primary rounded-t-lg h-[85%] hover:bg-primary/90 transition-colors cursor-pointer group relative">
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">85%</span>
            </div>
            <div className="flex-1 bg-emerald-100/30 rounded-t-lg h-[55%] hover:bg-emerald-200 transition-colors cursor-pointer group relative">
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">55%</span>
            </div>
            <div className="flex-1 bg-emerald-100/30 rounded-t-lg h-[70%] hover:bg-emerald-200 transition-colors cursor-pointer group relative">
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">70%</span>
            </div>
            <div className="flex-1 bg-secondary rounded-t-lg h-[95%] hover:bg-secondary/90 transition-colors cursor-pointer group relative">
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity">Peak</span>
            </div>
            <div className="flex-1 bg-emerald-100/30 rounded-t-lg h-[45%] hover:bg-emerald-200 transition-colors cursor-pointer group relative">
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">45%</span>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-4 bg-emerald-900 p-8 rounded-xl shadow-lg flex flex-col justify-between text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-4">Network Health</h2>
            <p className="text-emerald-100/70 text-sm mb-6">All systems are currently performing within expected operational boundaries.</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-emerald-400">
                <span>Uptime</span>
                <span>99.98%</span>
              </div>
              <div className="w-full bg-emerald-800 h-1.5 rounded-full overflow-hidden border border-emerald-950">
                <div className="w-[99.98%] h-full bg-amber-400 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 bg-emerald-950"></div>
        </div>
      </section>

      {/* AI Traffic Hub Section */}
      <section className="pb-12">
        <AITrafficHub />
      </section>
    </div>
  );
}
