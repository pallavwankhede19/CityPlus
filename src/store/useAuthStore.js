import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  username: localStorage.getItem('username') || null,
  error: null,

  login: async (username, password) => {
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return set({ error: data.error || 'Login failed' });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      set({ token: data.token, username: data.username, error: null });
    } catch {
      set({ error: 'Server not reachable' });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    set({ token: null, username: null });
  },
}));
