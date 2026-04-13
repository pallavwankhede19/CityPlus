import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';

export function Layout() {
  const navigate = useNavigate();
  const trafficLogs = useStore((state) => state.trafficLogs);
  const socketConnected = useStore((state) => state.socketConnected);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const notifRef = useRef(null);
  const helpRef = useRef(null);

  // Update unread count when new logs arrive
  useEffect(() => {
    if (trafficLogs.length > 0) {
      setUnreadCount(prev => Math.min(prev + 1, 9));
    }
  }, [trafficLogs.length]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (helpRef.current && !helpRef.current.contains(e.target)) setShowHelp(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const recentNotifications = trafficLogs.slice(0, 5);

  return (
    <div className="flex h-screen w-full bg-surface text-on-surface antialiased overflow-hidden">
      {/* SideNavBar Shell */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-[#134235] dark:bg-[#002118] flex flex-col py-6 z-50 shadow-2xl shadow-emerald-950/20">
        {/* Brand Header */}
        <div className="px-6 mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            CityPulse<span className="text-amber-400">.</span>
          </h1>
          <p className="text-xs text-[#a1d1bf] font-medium opacity-80 mt-1 uppercase tracking-widest pl-1">Executive Suite</p>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 mt-2">
          <NavLink 
            to="/" 
            end
            className={({isActive}) => clsx(
              "mx-2 px-4 py-3 flex items-center gap-3 transition-all duration-300",
              isActive 
                ? "bg-[#2d5a4c] text-white border-l-4 border-amber-400 rounded-r-full shadow-lg" 
                : "text-emerald-100/70 hover:bg-[#2d5a4c]/50 hover:text-white rounded-xl"
            )}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm font-medium uppercase tracking-wide">Dashboard</span>
          </NavLink>

          <NavLink 
            to="/ai-hub" 
            className={({isActive}) => clsx(
              "mx-2 px-4 py-3 flex items-center gap-3 transition-all duration-300",
              isActive 
                ? "bg-[#2d5a4c] text-white border-l-4 border-amber-400 rounded-r-full shadow-lg" 
                : "text-emerald-100/70 hover:bg-[#2d5a4c]/50 hover:text-white rounded-xl"
            )}
          >
            <span className="material-symbols-outlined">memory</span>
            <span className="text-sm font-medium uppercase tracking-wide">AI Traffic Hub</span>
          </NavLink>
          
          <NavLink 
            to="/users" 
            className={({isActive}) => clsx(
              "mx-2 px-4 py-3 flex items-center gap-3 transition-all duration-300",
              isActive 
                ? "bg-[#2d5a4c] text-white border-l-4 border-amber-400 rounded-r-full shadow-lg" 
                : "text-emerald-100/70 hover:bg-[#2d5a4c]/50 hover:text-white rounded-xl"
            )}
          >
            <span className="material-symbols-outlined">group</span>
            <span className="text-sm font-medium uppercase tracking-wide">App Users</span>
          </NavLink>
          
          <NavLink 
            to="/logs" 
            className={({isActive}) => clsx(
              "mx-2 px-4 py-3 flex items-center gap-3 transition-all duration-300",
              isActive 
                ? "bg-[#2d5a4c] text-white border-l-4 border-amber-400 rounded-r-full shadow-lg" 
                : "text-emerald-100/70 hover:bg-[#2d5a4c]/50 hover:text-white rounded-xl"
            )}
          >
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-sm font-medium uppercase tracking-wide">Traffic Logs</span>
          </NavLink>
          
          <NavLink 
            to="/settings" 
            className={({isActive}) => clsx(
              "mx-2 px-4 py-3 flex items-center gap-3 transition-all duration-300",
              isActive 
                ? "bg-[#2d5a4c] text-white border-l-4 border-amber-400 rounded-r-full shadow-lg" 
                : "text-emerald-100/70 hover:bg-[#2d5a4c]/50 hover:text-white rounded-xl"
            )}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium uppercase tracking-wide">Settings</span>
          </NavLink>
        </nav>
        
        {/* CTA & Footer — Click navigates to Profile in Settings */}
        <div className="px-6 mt-auto flex flex-col gap-4">
          <button 
            onClick={() => navigate('/settings?tab=Profile')}
            className="flex items-center gap-3 p-3 bg-[#2d5a4c]/30 rounded-xl hover:bg-[#2d5a4c]/60 transition-colors cursor-pointer w-full text-left"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm border-2 border-white/20">
              AS
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">Alex Sterling</p>
              <p className="text-[10px] text-[#a1d1bf] uppercase tracking-tighter truncate">Executive Admin</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-y-auto bg-surface-container-lowest">
        
        {/* TopNavBar Component */}
        <header className="w-full sticky top-0 z-40 bg-surface/70 backdrop-blur-xl flex justify-between items-center px-8 py-3 shadow-sm border-b border-outline-variant/10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 outline-none" placeholder="Search system configs or logs..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection status indicator */}
            <div className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
              socketConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            )}>
              <span className={clsx("w-1.5 h-1.5 rounded-full", socketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500")}></span>
              {socketConnected ? 'Live' : 'Demo'}
            </div>

            {/* Notification Button — Dynamic Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                className="relative p-2 text-slate-500 hover:bg-emerald-50 rounded-full transition-colors"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setUnreadCount(0);
                }}
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{unreadCount}</span>
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-on-surface">Notifications</h3>
                    <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-full">
                      {recentNotifications.length} Recent
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {recentNotifications.length > 0 ? recentNotifications.map((log) => (
                      <div key={log.id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors flex items-start gap-3">
                        <div className={clsx(
                          "w-2 h-2 rounded-full mt-1.5 shrink-0",
                          log.color === 'emerald' ? 'bg-emerald-500' : log.color === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                        )}></div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{log.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{log.desc}</p>
                          <p className="text-[10px] text-slate-300 font-mono mt-1">{log.time}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="px-5 py-8 text-center text-xs text-slate-400">No notifications yet</div>
                    )}
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100">
                    <button 
                      className="text-xs font-bold text-primary hover:underline w-full text-center"
                      onClick={() => { navigate('/logs'); setShowNotifications(false); }}
                    >
                      View All Traffic Logs →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Help & Support — Dynamic Dropdown */}
            <div className="relative" ref={helpRef}>
              <button 
                className="p-2 text-slate-500 hover:bg-emerald-50 rounded-full transition-colors flex items-center justify-center"
                onClick={() => setShowHelp(!showHelp)}
              >
                <span className="material-symbols-outlined">help</span>
              </button>
              
              {showHelp && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-on-surface">Help & Support</h3>
                    <p className="text-[10px] text-slate-400 mt-1">CityPulse Admin Dashboard v2.0</p>
                  </div>
                  <div className="p-3 space-y-1">
                    <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">menu_book</span>
                      <div>
                        <p className="text-xs font-bold text-on-surface">Documentation</p>
                        <p className="text-[10px] text-slate-400">API guides & integration docs</p>
                      </div>
                    </button>
                    <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
                      <div>
                        <p className="text-xs font-bold text-on-surface">AI Assistant</p>
                        <p className="text-[10px] text-slate-400">Get help configuring signals</p>
                      </div>
                    </button>
                    <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">bug_report</span>
                      <div>
                        <p className="text-xs font-bold text-on-surface">Report an Issue</p>
                        <p className="text-[10px] text-slate-400">Submit bugs or feature requests</p>
                      </div>
                    </button>
                    <button 
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3"
                      onClick={() => { navigate('/settings'); setShowHelp(false); }}
                    >
                      <span className="material-symbols-outlined text-primary text-lg">settings</span>
                      <div>
                        <p className="text-xs font-bold text-on-surface">System Settings</p>
                        <p className="text-[10px] text-slate-400">Configure endpoints & API keys</p>
                      </div>
                    </button>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100 bg-emerald-50/50">
                    <p className="text-[10px] text-emerald-700 font-medium text-center">
                      📧 support@citypulse.io • Pune, Maharashtra
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <Outlet />
        
      </main>
    </div>
  );
}
