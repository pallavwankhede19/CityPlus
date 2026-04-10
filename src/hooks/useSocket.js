import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';

export function useSocketConnection() {
  const setSocketConnected = useStore((state) => state.setSocketConnected);
  const setTrafficSignal = useStore((state) => state.setTrafficSignal);
  const updateUsers = useStore((state) => state.updateUsers);
  const addLog = useStore((state) => state.addLog);
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent StrictMode double-invoke from creating two sockets
    if (initialized.current) return;
    initialized.current = true;

    useStore.getState().fetchInitialData();

    const SOCKET_URL = localStorage.getItem('SOCKET_URL') || 'http://localhost:5000';
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
    });

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => setSocketConnected(false));

    socket.on('trafficSignalUpdate', (data) => {
      if (data?.signal) setTrafficSignal(data.signal);
    });

    socket.on('usersUpdate', (data) => {
      if (data?.count && data?.locations) updateUsers(data.count, data.locations);
    });

    socket.on('zonesUpdate', (zones) => {
      if (Array.isArray(zones)) useStore.getState().updateZoneStats(zones);
    });

    socket.on('newLog', (log) => addLog(log));

    socket.on('notificationsUpdate', (notifications) => {
      useStore.getState().setNotifications(notifications);
    });

    return () => {
      initialized.current = false;
      socket.disconnect();
    };
  }, [setSocketConnected, setTrafficSignal, updateUsers, addLog]);
}
