import { useState } from 'react';
import { useStore } from '../store/useStore';
import { TrafficSignalCard } from '../components/TrafficSignalCard';
import { MapCard } from '../components/MapCard';
import { AITrafficHub } from '../components/AITrafficHub';

export function Dashboard() {
  const [chartRange, setChartRange] = useState('7');
  const { trafficSignal, activeUsersNum, zones, socketConnected } = useStore();

  const chartData = {
    '7':  [40, 65, 85, 55, 70, 95, 45],
    '30': [55, 72, 60, 88, 45, 78, 92, 50, 65, 70, 48, 83, 61, 75, 58, 90, 44, 67, 80, 53, 71, 86, 49, 76, 62, 88, 57, 73, 95, 42],
  };
  const bars = chartData[chartRange];

  const generateReport = () => {
    const lines = [
      'CITYPULSE INTELLIGENCE REPORT',
      `Generated: ${new Date().toLocaleString()}`,
      '---',
      `Traffic Signal: ${trafficSignal.toUpperCase()}`,
      `Active Users: ${activeUsersNum}`,
      `Socket: ${socketConnected ? 'Connected' : 'Disconnected'}`,
      '---',
      'Zone Congestion:',
      ...zones.map(z => `  ${z.name}: ${z.percentage}%`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `citypulse_report_${Date.now()}.txt`;
    a.click();
  };
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
        <button onClick={generateReport} className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 whitespace-nowrap">
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
              <button onClick={() => setChartRange('7')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${chartRange === '7' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-700'}`}>7 Days</button>
              <button onClick={() => setChartRange('30')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${chartRange === '30' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-700'}`}>30 Days</button>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-1">
            {bars.map((val, i) => (
              <div key={i} className="flex-1 rounded-t-lg transition-all cursor-pointer group relative hover:opacity-80"
                style={{ height: `${val}%`, backgroundColor: val >= 90 ? 'var(--color-secondary)' : val >= 80 ? 'var(--color-primary)' : '#d1fae5' }}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{val}%</span>
              </div>
            ))}
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
