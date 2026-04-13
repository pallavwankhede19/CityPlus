import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function Settings() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'General';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab when URL query changes (e.g. clicking Alex Sterling → ?tab=Profile)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['General', 'Map Configuration', 'Socket API', 'Admin Access', 'Profile'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto w-full flex-1">
      {/* Header Section */}
      <div className="mb-10">
        <h2 className="text-4xl font-bold tracking-tight text-primary capitalize">Settings</h2>
        <p className="text-on-surface-variant mt-2 max-w-2xl">Manage global application parameters, real-time connectivity, and administrative access protocols.</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-12 gap-8 items-start pb-24">
        {/* Inner Navigation Menu (1/4) */}
        <nav className="col-span-12 lg:col-span-3 space-y-2">
          {['General', 'Profile', 'Map Configuration', 'Socket API', 'Admin Access'].map((tab) => (
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

        {/* Form Content Area (3/4) */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden p-8 border border-outline-variant/10">

            {/* Profile Tab */}
            {activeTab === 'Profile' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-outline-variant/10">
                  <div>
                    <h3 className="text-xl font-semibold text-primary">Profile Settings</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Manage your personal information and admin credentials.</p>
                  </div>
                </div>

                {/* Profile Card */}
                <div className="flex items-center gap-6 p-6 bg-surface-container-low rounded-2xl">
                  <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-2xl font-bold text-white border-4 border-white shadow-lg">
                    AS
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-on-surface">Alex Sterling</h4>
                    <p className="text-sm text-on-surface-variant">Executive Admin • Pune Operations</p>
                    <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Online Now
                    </p>
                  </div>
                </div>

                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Full Name</label>
                      <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" type="text" defaultValue="Alex Sterling" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Email</label>
                      <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" type="email" defaultValue="alex.sterling@citypulse.io" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Role</label>
                      <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none cursor-not-allowed opacity-60" type="text" defaultValue="Executive Admin" readOnly />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Phone</label>
                      <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" type="tel" defaultValue="+91 98765 43210" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Department</label>
                      <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" type="text" defaultValue="Traffic Operations - Pune Division" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                    <div>
                      <h4 className="text-sm font-semibold text-primary">Email Notifications</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">Receive alerts for critical signal changes and system events.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input defaultChecked className="sr-only peer" type="checkbox" />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-fixed-dim"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                    <div>
                      <h4 className="text-sm font-semibold text-primary">Two-Factor Authentication</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">Add an extra layer of security to your account.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input className="sr-only peer" type="checkbox" />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-fixed-dim"></div>
                    </label>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'Socket API' && (
              <>
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
                      <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" type="text" defaultValue="https://api.traffic-grid.systems/v1/pune/realtime" />
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
              </>
            )}

            {activeTab === 'General' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-outline-variant/10">
                  <div>
                    <h3 className="text-xl font-semibold text-primary">General Settings</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Configure baseline application preferences and display settings.</p>
                  </div>
                </div>
                <form className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Application Name</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" type="text" defaultValue="CityPulse Executive Suite" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Timezone</label>
                    <select className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none">
                      <option>Asia/Kolkata (IST +05:30)</option>
                      <option>America/New_York (EST)</option>
                      <option>America/Los_Angeles (PST)</option>
                      <option>UTC +00:00</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                    <div>
                      <h4 className="text-sm font-semibold text-primary">Maintenance Mode</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">Disable general user access while deploying updates.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input className="sr-only peer" type="checkbox" />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-fixed-dim"></div>
                    </label>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'Map Configuration' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-outline-variant/10">
                  <div>
                    <h3 className="text-xl font-semibold text-primary">Map Display Preferences</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Adjust visual thematic settings for the geospatial canvas.</p>
                  </div>
                </div>
                <form className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Default Map Style</label>
                    <select className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none">
                      <option>Dark Mode (Midnight)</option>
                      <option>Light Mode (High Contrast)</option>
                      <option>Satellite Hybrid</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Traffic Layer Opacity</label>
                    <input type="range" min="0" max="100" defaultValue="80" className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary" />
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mt-1">
                      <span>Low (0%)</span>
                      <span>High (100%)</span>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'Admin Access' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-outline-variant/10">
                  <div>
                    <h3 className="text-xl font-semibold text-primary">Access & Permissions</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Manage user roles and dashboard access credentials.</p>
                  </div>
                </div>
                <form className="space-y-6">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
                    <span className="material-symbols-outlined shrink-0">warning</span>
                    <p className="text-sm font-medium">Changing root access credentials will immediately terminate all active sessions including your own.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Current Password</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" placeholder="••••••••" type="password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">New Password</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none" placeholder="Enter new password" type="password" />
                  </div>
                </form>
              </div>
            )}
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
