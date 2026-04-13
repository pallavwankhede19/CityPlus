import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSocketConnection } from './hooks/useSocket';
import { useSimulation } from './hooks/useSimulation';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AppUsers } from './pages/AppUsers';
import { TrafficLogs } from './pages/TrafficLogs';
import { Settings } from './pages/Settings';
import { AITrafficHubPage } from './pages/AITrafficHubPage';

function AppContent() {
  useSocketConnection();
  useSimulation(); // Live demo simulation when backend is offline


  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Dashboard Content */}
        <Route index element={<Dashboard />} />
        {/* App Users Table */}
        <Route path="users" element={<AppUsers />} />
        {/* Traffic Logs & Analytics */}
        <Route path="logs" element={<TrafficLogs />} />
        {/* AI Traffic Hub */}
        <Route path="ai-hub" element={<AITrafficHubPage />} />
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
