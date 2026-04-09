import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';

export function useSocketConnection() {
  const setSocketConnected = useStore((state) => state.setSocketConnected);
  const setTrafficSignal = useStore((state) => state.setTrafficSignal);
  const updateUsers = useStore((state) => state.updateUsers);

  useEffect(() => {
    // In production, this URL will be provided by the backend developer
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 2000 // short timeout for demo purposes
    });

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Expected events from the Backend Developer
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
  }, [setSocketConnected, setTrafficSignal, updateUsers]);
}
