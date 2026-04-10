import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const notifications = useStore((s) => s.notifications);
  const markAllRead = useStore((s) => s.markAllRead);
  const unread = notifications.filter(n => !n.read).length;
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const colorMap = { green: 'bg-emerald-100 text-emerald-700', yellow: 'bg-amber-100 text-amber-700', red: 'bg-rose-100 text-rose-700' };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        className="relative p-2 text-slate-500 hover:bg-emerald-50 rounded-full transition-colors">
        <span className="material-symbols-outlined">notifications</span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-sm text-primary">Notifications</h3>
            <span className="text-[10px] text-slate-400 font-medium">{notifications.length} total</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-8">No notifications</p>
            ) : notifications.map(n => (
              <div key={n.id} className={`px-4 py-3 flex items-start gap-3 ${n.read ? 'opacity-60' : ''}`}>
                <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'green' ? 'bg-emerald-500' : n.type === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">{n.message}</p>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${colorMap[n.type] || 'bg-slate-100 text-slate-500'}`}>
                    {n.type?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
