import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';

export function Layout() {
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
        
        {/* CTA & Footer */}
        <div className="px-6 mt-auto flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-[#2d5a4c]/30 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm border-2 border-white/20">
              AS
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">Alex Sterling</p>
              <p className="text-[10px] text-[#a1d1bf] uppercase tracking-tighter truncate">Executive Admin</p>
            </div>
          </div>
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
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-500 hover:bg-emerald-50 rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-secondary-fixed-dim rounded-full border-2 border-white"></span>
            </button>
            <button className="p-2 text-slate-500 hover:bg-emerald-50 rounded-full transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <Outlet />
        
      </main>
    </div>
  );
}
