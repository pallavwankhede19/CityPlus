import { useRef, useState } from 'react';

const TABS = ['General', 'Map Configuration', 'Socket API', 'Admin Access'];

export function Settings() {
  const [activeTab, setActiveTab] = useState('Socket API');
  const socketUrlRef = useRef(null);
  const apiUrlRef = useRef(null);
  const mapsKeyRef = useRef(null);

  const handleSave = () => {
    if (socketUrlRef.current?.value) localStorage.setItem('SOCKET_URL', socketUrlRef.current.value);
    if (apiUrlRef.current?.value) localStorage.setItem('API_URL', apiUrlRef.current.value);
    if (mapsKeyRef.current?.value) localStorage.setItem('MAPS_KEY', mapsKeyRef.current.value);
    alert('Settings saved! Reload the app to apply changes.');
  };

  const handleCancel = () => {
    if (socketUrlRef.current) socketUrlRef.current.value = localStorage.getItem('SOCKET_URL') || 'http://localhost:5000';
    if (apiUrlRef.current) apiUrlRef.current.value = localStorage.getItem('API_URL') || 'http://localhost:5000/api';
    if (mapsKeyRef.current) mapsKeyRef.current.value = localStorage.getItem('MAPS_KEY') || '';
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto w-full flex-1">
      <div className="mb-10">
        <h2 className="text-4xl font-bold tracking-tight text-primary lowercase">settings</h2>
        <p className="text-on-surface-variant mt-2 max-w-2xl">Manage global application parameters, real-time connectivity, and administrative access protocols.</p>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start pb-24">
        <nav className="col-span-12 lg:col-span-3 space-y-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-5 py-3 rounded-xl text-sm transition-all ${
                activeTab === tab
                  ? 'font-bold bg-[#2d5a4c]/10 text-primary shadow-sm'
                  : 'font-medium hover:bg-white hover:shadow-sm text-on-surface-variant'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="col-span-12 lg:col-span-9">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden p-8 border border-outline-variant/10">

            {activeTab === 'Socket API' && (
              <>
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-outline-variant/10">
                  <div>
                    <h3 className="text-xl font-semibold text-primary">Socket API & Map Configuration</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Configure real-time stream endpoints and geospatial provider keys.</p>
                  </div>
                  <span className="bg-secondary-fixed text-on-secondary-fixed px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Live System</span>
                </div>
                <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Google Maps API Key</label>
                      <div className="relative">
                        <input ref={mapsKeyRef} className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" placeholder="Enter API Key" type="password" defaultValue={localStorage.getItem('MAPS_KEY') || ''} />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors" type="button">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Socket.io Backend URL</label>
                      <input ref={socketUrlRef} className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" type="text" defaultValue={localStorage.getItem('SOCKET_URL') || 'http://localhost:5000'} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Traffic API Endpoint</label>
                      <input ref={apiUrlRef} className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" type="text" defaultValue={localStorage.getItem('API_URL') || 'http://localhost:5000/api'} />
                    </div>
                  </div>
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
              </>
            )}

            {activeTab === 'General' && (
              <div>
                <h3 className="text-xl font-semibold text-primary mb-6">General Settings</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-surface-container-low rounded-xl">
                    <p className="text-sm font-semibold text-primary">Application Name</p>
                    <input className="mt-2 w-full bg-surface-container border-none rounded-lg px-4 py-2 text-sm outline-none" defaultValue="CityPulse Executive Suite" />
                  </div>
                  <div className="p-4 bg-surface-container-low rounded-xl">
                    <p className="text-sm font-semibold text-primary">Refresh Interval</p>
                    <select className="mt-2 w-full bg-surface-container border-none rounded-lg px-4 py-2 text-sm outline-none">
                      <option>5 seconds</option>
                      <option>10 seconds</option>
                      <option>30 seconds</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Map Configuration' && (
              <div>
                <h3 className="text-xl font-semibold text-primary mb-6">Map Configuration</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-surface-container-low rounded-xl">
                    <p className="text-sm font-semibold text-primary">Default Map Center</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <input className="bg-surface-container border-none rounded-lg px-4 py-2 text-sm outline-none" placeholder="Latitude" defaultValue="40.7128" />
                      <input className="bg-surface-container border-none rounded-lg px-4 py-2 text-sm outline-none" placeholder="Longitude" defaultValue="-74.0060" />
                    </div>
                  </div>
                  <div className="p-4 bg-surface-container-low rounded-xl">
                    <p className="text-sm font-semibold text-primary">Default Zoom Level</p>
                    <input type="range" min="8" max="18" defaultValue="13" className="mt-2 w-full" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Admin Access' && (
              <div>
                <h3 className="text-xl font-semibold text-primary mb-6">Admin Access</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-surface-container-low rounded-xl">
                    <p className="text-sm font-semibold text-primary">Admin Username</p>
                    <input className="mt-2 w-full bg-surface-container border-none rounded-lg px-4 py-2 text-sm outline-none" defaultValue="Alex Sterling" />
                  </div>
                  <div className="p-4 bg-surface-container-low rounded-xl">
                    <p className="text-sm font-semibold text-primary">Change Password</p>
                    <input type="password" className="mt-2 w-full bg-surface-container border-none rounded-lg px-4 py-2 text-sm outline-none" placeholder="New password" />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 right-0 w-[calc(100%-16rem)] p-6 bg-surface/80 backdrop-blur-md z-30 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          <div className="bg-white/90 shadow-2xl rounded-2xl p-4 flex items-center justify-end gap-4 border border-white/40">
            <button onClick={handleCancel} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button onClick={handleSave} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-[#2d5a4c] text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
              Save Changes
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
