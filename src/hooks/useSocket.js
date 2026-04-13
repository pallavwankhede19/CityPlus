import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';

export function useSocketConnection() {
  const setSocketConnected = useStore((state) => state.setSocketConnected);
  const setTrafficSignal = useStore((state) => state.setTrafficSignal);
  const updateUsers = useStore((state) => state.updateUsers);
  const setIntersectionData = useStore((state) => state.setIntersectionData);
  const addLog = useStore((state) => state.addLog);

  useEffect(() => {
    // Backend runs on port 5000 by default (see backend/.env.example: PORT=5000)
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 2000
    });

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // ─── Backend event: intersection_update ────────────────────────────────
    // Emitted by:
    //   1. agent.py live_emission_loop (every 1s via python-socketio)
    //   2. intersectionController.js ingestIntersectionData (on POST /api/intersection-data)
    //
    // Payload shape (from agent.py build_live_payload):
    // {
    //   intersection_id:   "INT_001",
    //   intersection_name: "FC Road & Bhandarkar Rd",
    //   location:          { lat: 18.5204, lng: 73.8567 },
    //   timestamp:         "2026-04-08T08:45:00+00:00",
    //   cycle_time:        120,
    //   current_phase:     "north",
    //   signals: {
    //     north: { state: "GREEN",  remaining_time: 14, queue_length: 10, density: "Medium" },
    //     south: { state: "RED",    remaining_time: 47, queue_length:  3, density: "Low" },
    //     east:  { state: "RED",    remaining_time: 62, queue_length:  7, density: "Medium" },
    //     west:  { state: "RED",    remaining_time: 75, queue_length:  1, density: "Low" },
    //   }
    // }
    socket.on('intersection_update', (data) => {
      if (!data) return;

      // Feed full payload into the store — maps to all existing UI fields
      setIntersectionData(data);

      // Auto-generate a traffic log entry when there's a phase transition
      if (data.signals && data.current_phase) {
        const phase = data.current_phase;
        const signalInfo = data.signals[phase];
        if (signalInfo && signalInfo.state === 'GREEN' && signalInfo.remaining_time > 0) {
          // Only log once near the start of a green phase (remaining_time close to full)
          const green = signalInfo.remaining_time;
          if (green > 5) {
            // Avoid duplicate flooding — the store addLog prepends, UI shows latest
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });
            const intersectionName = data.intersection_name || data.intersection_id;

            addLog({
              id: Date.now(),
              title: `Signal turned Green — ${phase.charAt(0).toUpperCase() + phase.slice(1)}`,
              time: timeStr,
              desc: `${intersectionName}: ${phase.toUpperCase()} phase active. Queue: ${signalInfo.queue_length} vehicles. Density: ${signalInfo.density}.`,
              iconType: 'traffic',
              color: 'emerald',
              tags: [signalInfo.density, data.intersection_id],
            });
          }
        }
      }
    });

    // ─── Legacy events (kept for backward compatibility) ───────────────────
    socket.on('trafficSignalUpdate', (data) => {
      if (data && data.signal) setTrafficSignal(data.signal);
    });

    socket.on('usersUpdate', (data) => {
      if (data && data.count && data.locations) {
        updateUsers(data.count, data.locations);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [setSocketConnected, setTrafficSignal, updateUsers, setIntersectionData, addLog]);
}
