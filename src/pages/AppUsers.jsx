import { useState } from 'react';
import { useStore } from '../store/useStore';

export function AppUsers() {
  const activeUsersPoints = useStore((state) => state.activeUsersPoints);
  const activeUsersNum = useStore((state) => state.activeUsersNum);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const statuses = ['driving green', 'waiting at red', 'offline'];
  const statusColors = ['emerald', 'amber', 'slate'];
  const statusMap = { 'All': null, 'Active Route': 'driving green', 'Idle': 'waiting at red', 'Offline': 'offline' };

  // Assign status to each user before filtering so index is stable
  const usersWithStatus = activeUsersPoints.map((user, index) => ({
    ...user,
    status: statuses[index % 3],
    statusColor: statusColors[index % 3],
    zone: `Zone ${String.fromCharCode(65 + index % 6)}`,
  }));

  const filteredUsers = usersWithStatus.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      String(user.id).includes(search);
    const matchesStatus = !statusMap[statusFilter] || user.status === statusMap[statusFilter];
    return matchesSearch && matchesStatus;
  });

  const exportData = () => {
    const rows = [['ID', 'Name', 'Latitude', 'Longitude'],
      ...filteredUsers.map(u => [u.id, u.name, u.lat, u.lng])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'app_users.csv';
    a.click();
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full flex-1">
      <div className="flex flex-col gap-1">
        <span className="text-secondary font-bold text-xs uppercase tracking-[0.2em] px-1">Network Management</span>
        <h2 className="text-5xl font-extrabold text-primary tracking-tight font-headline">app users</h2>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-wrap items-center gap-4 shadow-sm border border-outline-variant/10">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-1 focus:ring-primary/20 transition-all outline-none"
            placeholder="Filter by name or ID"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="bg-surface-container-low border-none rounded-xl text-sm font-semibold px-4 py-3 pr-10 focus:ring-1 focus:ring-primary/20 outline-none text-on-surface-variant"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>Active Route</option>
            <option>Idle</option>
            <option>Offline</option>
          </select>
        </div>
        <button onClick={exportData} className="bg-primary text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-lg">ios_share</span>
          Export Data
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 border-b border-primary/10">
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-primary">User ID</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-primary">Name</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-primary">Current Zone</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-primary">Signal Status</th>
                <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-primary">Last Active</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => {
                  const uiId = `#CP-${String(user.id).padStart(4, '0')}-${String.fromCharCode(65 + index % 26)}`;
                  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
                  return (
                    <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5"><span className="text-xs font-mono font-medium text-slate-400">{uiId}</span></td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary text-xs">{initials}</div>
                          <span className="text-sm font-bold text-on-surface">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1 text-on-surface-variant text-sm font-medium">
                          <span className="material-symbols-outlined text-sm text-primary/40">location_on</span>
                          {user.zone}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold border ${
                          user.statusColor === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          user.statusColor === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            user.statusColor === 'emerald' ? 'bg-emerald-500 animate-pulse' :
                            user.statusColor === 'amber' ? 'bg-amber-500' : 'bg-slate-400'
                          }`}></span>
                          {user.status}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs text-slate-500 font-medium">Just now</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 text-slate-300 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No users match your filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-400">Showing {filteredUsers.length} of {activeUsersNum.toLocaleString()} active users</p>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 disabled:opacity-30" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary-container text-white p-6 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Peak Traffic Hours</p>
            <p className="text-2xl font-extrabold mt-1">08:00 - 09:30</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span className="text-xs font-medium">+14% vs yesterday</span>
            </div>
          </div>
          <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-white/10 text-[8rem] group-hover:scale-110 transition-transform duration-500">speed</span>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-primary/5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest">Active Signals</p>
            <p className="text-3xl font-extrabold text-primary mt-1">1,402</p>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-emerald-500 w-[72%]"></div>
          </div>
        </div>
        <div className="bg-secondary-fixed text-secondary-fixed-variant p-6 rounded-xl shadow-sm border border-secondary/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Grid Stability</p>
              <p className="text-3xl font-extrabold mt-1">99.8%</p>
            </div>
            <div className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
            </div>
          </div>
          <p className="text-xs mt-4 font-medium italic">Systems nominal across all 12 zones.</p>
        </div>
      </div>
    </div>
  );
}
