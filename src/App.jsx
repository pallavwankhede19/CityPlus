import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSocketConnection } from './hooks/useSocket';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AppUsers } from './pages/AppUsers';
import { TrafficLogs } from './pages/TrafficLogs';
import { Settings } from './pages/Settings';

function AppContent() {
  // Initialize Socket.io connection and sync with Zustand inside the Router context
  // or at least inside a component so hooks can work if they depend on context later.
  useSocketConnection();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Dashboard Content */}
        <Route index element={<Dashboard />} />
        {/* App Users Table */}
        <Route path="users" element={<AppUsers />} />
        {/* Traffic Logs & Analytics */}
        <Route path="logs" element={<TrafficLogs />} />
        {/* System Settings */}
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
