import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useStore } from '../store/useStore';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export function MapCard() {
  const activeUsersPoints = useStore((state) => state.activeUsersPoints);

  return (
    <section className="w-full relative">
      <div className="bg-surface-container-lowest rounded-xl shadow-sm shadow-emerald-900/5 overflow-hidden h-[500px] border border-emerald-900/10 relative">
        {!GOOGLE_MAPS_API_KEY && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
            <div className="bg-secondary-container text-secondary-fixed-variant px-8 py-4 rounded-full shadow-2xl shadow-secondary/30 flex items-center gap-4 backdrop-blur-md border border-white/30">
              <span className="material-symbols-outlined animate-spin">key</span>
              <span className="font-bold tracking-tight text-lg">Waiting for API Route Key</span>
            </div>
          </div>
        )}
        
        {/* Map Elements */}
        {GOOGLE_MAPS_API_KEY ? (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultZoom={13}
                defaultCenter={{ lat: 40.7128, lng: -74.0060 }}
                mapId="DEMO_MAP_ID"
                gestureHandling={'greedy'}
                disableDefaultUI={true}
              >
                {activeUsersPoints.map((user) => (
                  <AdvancedMarker key={user.id} position={{ lat: user.lat, lng: user.lng }}>
                    <Pin background={"#059669"} borderColor={"#064e3b"} glyphColor={"#fff"} />
                  </AdvancedMarker>
                ))}
              </Map>
            </APIProvider>
          </div>
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center relative overflow-hidden opacity-40">
             {/* Map Placeholder */}
             <div className="w-full h-full bg-slate-200"></div>
          </div>
        )}

        {/* Map Overlay Controls */}
        <div className="absolute top-6 left-6 z-30 pointer-events-none">
          <div className="bg-white/90 backdrop-blur px-4 py-3 rounded-xl shadow-lg border border-white/50 flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600">explore</span>
            <span className="text-sm font-bold text-slate-700">Central Business District</span>
          </div>
        </div>
        
      </div>
    </section>
  );
}
