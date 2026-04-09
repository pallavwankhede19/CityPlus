export function Settings() {
  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto w-full flex-1">
      {/* Header Section */}
      <div className="mb-10">
        <h2 className="text-4xl font-bold tracking-tight text-primary lowercase">settings</h2>
        <p className="text-on-surface-variant mt-2 max-w-2xl">Manage global application parameters, real-time connectivity, and administrative access protocols.</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-12 gap-8 items-start pb-24">
        {/* Inner Navigation Menu (1/4) */}
        <nav className="col-span-12 lg:col-span-3 space-y-2">
          <button className="w-full text-left px-5 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white hover:shadow-sm text-on-surface-variant">
              General
          </button>
          <button className="w-full text-left px-5 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white hover:shadow-sm text-on-surface-variant">
              Map Configuration
          </button>
          <button className="w-full text-left px-5 py-3 rounded-xl text-sm font-bold transition-all bg-[#2d5a4c]/10 text-primary shadow-sm">
              Socket API
          </button>
          <button className="w-full text-left px-5 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white hover:shadow-sm text-on-surface-variant">
              Admin Access
          </button>
        </nav>

        {/* Form Content Area (3/4) */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden p-8 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-outline-variant/10">
              <div>
                <h3 className="text-xl font-semibold text-primary">Socket API & Map Configuration</h3>
                <p className="text-xs text-on-surface-variant mt-1">Configure real-time stream endpoints and geospatial provider keys.</p>
              </div>
              <span className="bg-secondary-fixed text-on-secondary-fixed px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Live System</span>
            </div>

            <form className="space-y-8">
              {/* API Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Google Maps API Key</label>
                  <div className="relative">
                    <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" placeholder="Enter API Key" type="password" defaultValue="••••••••••••••••" />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors" type="button">
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Socket.io Backend URL</label>
                  <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" type="text" defaultValue="wss://socket.citypulse.io/v2" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Traffic API Endpoint</label>
                  <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" type="text" defaultValue="https://api.traffic-grid.systems/v1/metropolitan/realtime" />
                </div>
              </div>

              {/* Map Illustration / Status */}
              <div className="relative h-48 rounded-xl overflow-hidden bg-surface-container-low group border border-outline-variant/10">
                <div className="w-full h-full bg-slate-300"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-white/50 flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                    </span>
                    <span className="text-sm font-semibold text-primary">Map Engine: Active</span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                  <div>
                    <h4 className="text-sm font-semibold text-primary">Enable Real-time Map Pings</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">Stream live vehicle and citizen data to the visual dashboard.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input defaultChecked className="sr-only peer" type="checkbox" />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-fixed-dim"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                  <div>
                    <h4 className="text-sm font-semibold text-primary">Log Offline Users</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">Maintain metadata for users who disconnect unexpectedly.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input className="sr-only peer" type="checkbox" />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-fixed-dim"></div>
                  </label>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Sticky Footer Actions */}
      <footer className="fixed bottom-0 right-0 w-[calc(100%-16rem)] p-6 bg-surface/80 backdrop-blur-md z-30 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          <div className="bg-white/90 shadow-2xl rounded-2xl p-4 flex items-center justify-end gap-4 border border-white/40">
            <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
                Cancel
            </button>
            <button className="px-8 py-2.5 rounded-xl text-sm font-bold bg-[#2d5a4c] text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                Save Changes
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
