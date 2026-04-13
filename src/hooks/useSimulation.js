import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * Live Simulation Engine — Mimics backend agent.py behavior for demo/hackathon.
 * 
 * When the real backend (localhost:5000) is NOT connected, this hook generates
 * realistic intersection_update events every second, driving the entire dashboard
 * with live-feeling data. When the backend IS connected, this does nothing.
 * 
 * This is what makes the hackathon demo look alive without needing Python + YOLO running.
 */

// Pune intersection registry (mirrors agent.py PUNE_INTERSECTIONS)
const PUNE_INTERSECTIONS = [
  { id: 'INT_001', name: 'FC Road & Bhandarkar Rd',   lat: 18.5204, lng: 73.8567 },
  { id: 'INT_002', name: 'Shivajinagar Signal',        lat: 18.5308, lng: 73.8474 },
  { id: 'INT_003', name: 'Karve Road & Paud Road',     lat: 18.5088, lng: 73.8238 },
  { id: 'INT_004', name: 'Pune Station Junction',       lat: 18.5287, lng: 73.8741 },
  { id: 'INT_005', name: 'Swargate Bus Stand',          lat: 18.5018, lng: 73.8636 },
  { id: 'INT_006', name: 'Viman Nagar Signal',          lat: 18.5679, lng: 73.9143 },
  { id: 'INT_007', name: 'Kothrud Depot Signal',        lat: 18.5080, lng: 73.8065 },
  { id: 'INT_008', name: 'Hadapsar Industrial Estate',  lat: 18.5019, lng: 73.9346 },
  { id: 'INT_009', name: 'Wakad-Hinjewadi Junction',    lat: 18.5930, lng: 73.7559 },
  { id: 'INT_010', name: 'Deccan Gymkhana Signal',      lat: 18.5168, lng: 73.8462 },
];

const DIRECTIONS = ['north', 'south', 'east', 'west'];
const DENSITIES = ['Low', 'Medium', 'High'];

function generateSignalCycle() {
  // Generate realistic green times per direction (Indian traffic model)
  const greenTimes = DIRECTIONS.map(() => Math.floor(Math.random() * 35) + 15); // 15-50s
  const totalCycle = greenTimes.reduce((a, b) => a + b + 3, 0); // +3s yellow each
  return { greenTimes, totalCycle };
}

export function useSimulation() {
  const socketConnected = useStore((state) => state.socketConnected);
  const setIntersectionData = useStore((state) => state.setIntersectionData);
  const addLog = useStore((state) => state.addLog);

  const cycleRef = useRef(null);
  const elapsedRef = useRef(0);
  const lastPhaseRef = useRef(null);
  const queuesRef = useRef({ north: 10, south: 5, east: 8, west: 12 });

  useEffect(() => {
    // If real backend is connected, skip simulation
    if (socketConnected) return;

    // Generate initial cycle
    if (!cycleRef.current) {
      cycleRef.current = generateSignalCycle();
    }

    const interval = setInterval(() => {
      const cycle = cycleRef.current;
      const elapsed = elapsedRef.current;

      // Build phase windows
      let cursor = 0;
      const windows = DIRECTIONS.map((dir, i) => {
        const greenStart = cursor;
        const yellowStart = cursor + cycle.greenTimes[i];
        const phaseEnd = yellowStart + 3;
        cursor = phaseEnd;
        return { dir, greenStart, yellowStart, phaseEnd };
      });

      // Determine current state for each direction
      const cycleElapsed = elapsed % cycle.totalCycle;
      let currentPhase = null;
      const signals = {};

      windows.forEach((win) => {
        let currentQueue = queuesRef.current[win.dir] || 0;

        if (cycleElapsed >= win.greenStart && cycleElapsed < win.yellowStart) {
          // GREEN phase: decrease queue
          currentQueue = Math.max(0, currentQueue - Math.floor(Math.random() * 3) + Math.floor(Math.random() * 2));
          const density = currentQueue <= 5 ? 'Low' : currentQueue <= 15 ? 'Medium' : 'High';
          signals[win.dir] = {
            state: 'GREEN',
            remaining_time: Math.max(0, Math.round(win.yellowStart - cycleElapsed)),
            queue_length: currentQueue,
            density,
          };
          currentPhase = win.dir;
        } else if (cycleElapsed >= win.yellowStart && cycleElapsed < win.phaseEnd) {
          // YELLOW phase: slowly increase or maintain
          currentQueue += Math.floor(Math.random() * 2);
          const density = currentQueue <= 5 ? 'Low' : currentQueue <= 15 ? 'Medium' : 'High';
          signals[win.dir] = {
            state: 'YELLOW',
            remaining_time: Math.max(0, Math.round(win.phaseEnd - cycleElapsed)),
            queue_length: currentQueue,
            density,
          };
          currentPhase = win.dir;
        } else {
          // RED phase: increase queue only
          currentQueue += Math.floor(Math.random() * 2);
          const density = currentQueue <= 5 ? 'Low' : currentQueue <= 15 ? 'Medium' : 'High';
          const remaining = (win.greenStart - cycleElapsed + cycle.totalCycle) % cycle.totalCycle;
          signals[win.dir] = {
            state: 'RED',
            remaining_time: Math.max(0, Math.round(remaining)),
            queue_length: currentQueue,
            density,
          };
        }
        queuesRef.current[win.dir] = currentQueue;
      });

      // Pick a random intersection for variety
      const intersection = PUNE_INTERSECTIONS[Math.floor(elapsed / 60) % PUNE_INTERSECTIONS.length];

      const payload = {
        intersection_id: intersection.id,
        intersection_name: intersection.name,
        location: { lat: intersection.lat, lng: intersection.lng },
        timestamp: new Date().toISOString(),
        cycle_time: cycle.totalCycle,
        current_phase: currentPhase,
        signals,
      };

      setIntersectionData(payload);

      // Log phase transitions
      if (currentPhase && currentPhase !== lastPhaseRef.current) {
        const signalInfo = signals[currentPhase];
        if (signalInfo && signalInfo.state === 'GREEN') {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });
          addLog({
            id: Date.now(),
            title: `Signal turned Green — ${currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)}`,
            time: timeStr,
            desc: `${intersection.name}: ${currentPhase.toUpperCase()} phase active. Queue: ${signalInfo.queue_length} vehicles. Density: ${signalInfo.density}.`,
            iconType: 'traffic',
            color: 'emerald',
            tags: [signalInfo.density, intersection.id],
          });
        }
        lastPhaseRef.current = currentPhase;
      }

      // Regenerate cycle periodically
      if (elapsed > 0 && elapsed % cycle.totalCycle === 0) {
        cycleRef.current = generateSignalCycle();
      }

      elapsedRef.current = elapsed + 1;
    }, 1000);

    return () => clearInterval(interval);
  }, [socketConnected, setIntersectionData, addLog]);
}
