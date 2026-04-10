import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSocketConnection } from './hooks/useSocket';
import { useAuthStore } from './store/useAuthStore';
import { SearchProvider } from './store/SearchContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AppUsers } from './pages/AppUsers';
import { TrafficLogs } from './pages/TrafficLogs';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';

// Clear stale production URLs from localStorage on startup
const storedSocket = localStorage.getItem('SOCKET_URL');
const storedApi = localStorage.getItem('API_URL');
if (storedSocket && !storedSocket.includes('localhost')) localStorage.removeItem('SOCKET_URL');
if (storedApi && !storedApi.includes('localhost')) localStorage.removeItem('API_URL');

function AppContent() {
  const token = useAuthStore((s) => s.token);
  useSocketConnection();

  if (!token) return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<AppUsers />} />
        <Route path="logs" element={<TrafficLogs />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SearchProvider>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </SearchProvider>
    </BrowserRouter>
  );
}

function LoginGuard() {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/" replace /> : <Login />;
}

export default App;
