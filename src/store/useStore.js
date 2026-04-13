import { create } from 'zustand';

// Throttle: zones only update once per hour
let _lastZoneUpdate = 0;

export const useStore = create((set) => ({
  trafficSignal: 'green',
  activeUsersNum: 142,
  activeUsersPoints: [
    { id: 1, lat: 18.5204, lng: 73.8567, name: 'User 1' },
    { id: 2, lat: 18.5234, lng: 73.8540, name: 'User 2' },
    { id: 3, lat: 18.5184, lng: 73.8580, name: 'User 3' },
  ],
  socketConnected: false,
  
  // Live intersection data from backend (agent.py → server.js → Socket.IO → here)
  intersectionData: null,       // full payload from 'intersection_update' event
  signalStates: {},             // { north: { state, remaining_time, queue_length, density }, ... }
  currentPhase: null,           // which direction currently has GREEN
  cycleTime: 0,                 // total signal cycle duration in seconds
  intersectionId: 'INT_001',
  intersectionName: 'FC Road & Bhandarkar Rd',
  lastUpdated: null,

  zones: [
    { name: 'Shivajinagar Core', percentage: 88 },
    { name: 'Pimpri Industrial', percentage: 42 },
    { name: 'Kothrud Residence', percentage: 65 },
    { name: 'Hinjewadi Tech Park', percentage: 29 },
  ],
  trafficLogs: [
    { id: 1, title: 'Signal turned Green', time: '14:22:45', desc: 'Junction 42 - FC Road & Bhandarkar Rd. Automatic throughput optimization active based on Northbound density.', iconType: 'traffic', color: 'emerald', tags: ['Optimal Flow', 'Zone A'] },
    { id: 2, title: 'Emergency Vehicle Override', time: '14:18:12', desc: 'Priority corridor cleared for Ambulance unit #429. Signals on JM Road transitioned to caution flash.', iconType: 'bolt', color: 'amber', tags: ['Critical Priority', 'Hospital Zone'] },
    { id: 3, title: 'Signal turned Red', time: '14:15:01', desc: 'Junction 19 - Swargate. Congestion relief initiated. Holding traffic to clear bottleneck at Roundabout 4.', iconType: 'traffic', color: 'rose', tags: ['Capacity Management', 'Zone C'] },
  ],

  setTrafficSignal: (signal) => set({ trafficSignal: signal }),
  setSocketConnected: (status) => set({ socketConnected: status }),
  updateUsers: (count, points) => set({ activeUsersNum: count, activeUsersPoints: points }),
  
  // Called when backend emits 'intersection_update' with full live payload
  setIntersectionData: (data) => set((state) => {
    const updates = { intersectionData: data };
    
    if (data.signals) {
      updates.signalStates = data.signals;
    }
    if (data.current_phase) {
      updates.currentPhase = data.current_phase;
    }
    if (data.cycle_time) {
      updates.cycleTime = data.cycle_time;
    }
    if (data.intersection_id) {
      updates.intersectionId = data.intersection_id;
    }
    if (data.intersection_name) {
      updates.intersectionName = data.intersection_name;
    }
    if (data.last_updated || data.timestamp) {
      updates.lastUpdated = data.last_updated || data.timestamp;
    }

    // Derive the overall traffic signal color from the current green phase's state
    if (data.signals && data.current_phase) {
      const activeSignal = data.signals[data.current_phase];
      if (activeSignal) {
        const stateMap = { GREEN: 'green', YELLOW: 'yellow', RED: 'red' };
        updates.trafficSignal = stateMap[activeSignal.state] || 'green';
      }
    }

    // Update zone congestion from signal queue/density data — throttled to once per hour
    if (data.signals) {
      const now = Date.now();
      if (now - _lastZoneUpdate > 3600000) { // 1 hour
        const directionToZone = {
          north: 'Shivajinagar Core',
          south: 'Pimpri Industrial',
          east: 'Kothrud Residence',
          west: 'Hinjewadi Tech Park',
        };
        const densityToPercent = { Low: 30, Medium: 60, High: 90 };
        const newZones = Object.entries(data.signals).map(([dir, info]) => ({
          name: directionToZone[dir] || dir,
          percentage: densityToPercent[info.density] || 50,
        }));
        if (newZones.length > 0) {
          updates.zones = newZones;
          _lastZoneUpdate = now;
        }
      }
    }

    return updates;
  }),

  updateZoneStats: (newZones) => set({ zones: newZones }),
  addLog: (newLog) => set((state) => ({ trafficLogs: [newLog, ...state.trafficLogs] })),
  setLogs: (logs) => set({ trafficLogs: logs })
}));
