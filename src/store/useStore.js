import { create } from 'zustand';

export const useStore = create((set) => ({
  trafficSignal: 'green',
  activeUsersNum: 142,
  activeUsersPoints: [
    { id: 1, lat: 40.7128, lng: -74.0060, name: 'User 1' },
    { id: 2, lat: 40.7138, lng: -74.0040, name: 'User 2' },
    { id: 3, lat: 40.7118, lng: -74.0080, name: 'User 3' },
  ],
  socketConnected: false,
  notifications: [],
  
  zones: [
    { name: 'Downtown Core', percentage: 88 },
    { name: 'Industrial North', percentage: 42 },
    { name: 'West End Residence', percentage: 65 },
    { name: 'Tech Park', percentage: 29 },
  ],
  trafficLogs: [
    { id: 1, title: 'Signal turned Green', time: '14:22:45', desc: 'Junction 42 - 5th Avenue & Main. Automatic throughput optimization active based on Northbound density.', iconType: 'traffic', color: 'emerald', tags: ['Optimal Flow', 'Zone A'] },
    { id: 2, title: 'Emergency Vehicle Override', time: '14:18:12', desc: 'Priority corridor cleared for Ambulance unit #429. Signals on 8th Blvd transitioned to caution flash.', iconType: 'bolt', color: 'amber', tags: ['Critical Priority', 'Hospital Zone'] },
    { id: 3, title: 'Signal turned Red', time: '14:15:01', desc: 'Junction 19 - East Gate. Congestion relief initiated. Holding traffic to clear bottleneck at Roundabout 4.', iconType: 'traffic', color: 'rose', tags: ['Capacity Management', 'Zone C'] },
  ],

  setTrafficSignal: (signal) => set({ trafficSignal: signal }),
  setSocketConnected: (status) => set({ socketConnected: status }),
  updateUsers: (count, points) => set({ activeUsersNum: count, activeUsersPoints: points }),
  
  updateZoneStats: (newZones) => set({ zones: newZones }),
  addLog: (newLog) => set((state) => ({ trafficLogs: [newLog, ...state.trafficLogs] })),
  setLogs: (logs) => set({ trafficLogs: logs }),
  setNotifications: (notifications) => set({ notifications }),
  markAllRead: () => set((state) => ({ notifications: state.notifications.map(n => ({ ...n, read: true })) })),
  addNotification: (n) => set((state) => ({ notifications: [n, ...state.notifications].slice(0, 20) })),

  fetchInitialData: async () => {
    try {
      const url = localStorage.getItem('API_URL') || 'http://localhost:5000/api';
      const [logsRes, zonesRes, usersRes, statusRes] = await Promise.all([
        fetch(`${url}/logs`),
        fetch(`${url}/zones`),
        fetch(`${url}/users`),
        fetch(`${url}/status`),
      ]);
      const [logs, zones, users, status] = await Promise.all([
        logsRes.json(), zonesRes.json(), usersRes.json(), statusRes.json(),
      ]);
      set({
        trafficLogs: logs,
        zones,
        activeUsersNum: users.count,
        activeUsersPoints: users.locations,
        trafficSignal: status.signal,
      });
    } catch (e) {
      console.warn('Backend not reachable, using default data.');
    }
  },
}));

