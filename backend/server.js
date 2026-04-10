const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { getSignal, setSignal, getUsers, getZones, getLogs, insertLog, updateZones } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'citypulse_secret';

// --- Auth middleware ---
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// --- Auth routes ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'citypulse123') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, username });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// --- REST API ---
app.get('/api/status', (req, res) => res.json({ signal: getSignal() }));
app.get('/api/users', (req, res) => res.json({ count: getUsers().length, locations: getUsers() }));
app.get('/api/zones', (req, res) => res.json(getZones()));
app.get('/api/logs', (req, res) => res.json(getLogs()));

app.post('/api/signal', authMiddleware, (req, res) => {
  const { signal } = req.body;
  if (!['red', 'yellow', 'green'].includes(signal))
    return res.status(400).json({ error: 'Invalid signal value' });
  setSignal(signal);
  io.emit('trafficSignalUpdate', { signal });
  clearInterval(autoInterval);
  autoInterval = setInterval(rotateSignal, 5000);
  res.json({ success: true, signal });
});

app.post('/api/logs', authMiddleware, (req, res) => {
  const log = { id: Date.now(), ...req.body };
  insertLog(log);
  io.emit('newLog', log);
  res.status(201).json(log);
});

// --- Notifications ---
const notifications = [];
app.get('/api/notifications', authMiddleware, (req, res) => res.json(notifications));

// --- Socket.io ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('trafficSignalUpdate', { signal: getSignal() });
  socket.emit('usersUpdate', { count: getUsers().length, locations: getUsers() });
  socket.emit('zonesUpdate', getZones());
  socket.emit('notificationsUpdate', notifications);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// --- Live simulation ---
const signals = ['red', 'yellow', 'green'];

function rotateSignal() {
  const current = getSignal();
  const next = signals[(signals.indexOf(current) + 1) % signals.length];
  setSignal(next);
  io.emit('trafficSignalUpdate', { signal: next });

  const users = getUsers();
  io.emit('usersUpdate', { count: users.length, locations: users });

  const zones = getZones().map(z => ({
    ...z,
    percentage: Math.min(99, Math.max(10, z.percentage + Math.floor(Math.random() * 10) - 4))
  }));
  updateZones(zones);
  io.emit('zonesUpdate', zones);

  const now = new Date();
  const time = now.toTimeString().split(' ')[0];
  const newLog = {
    id: Date.now(),
    title: `Signal turned ${next.charAt(0).toUpperCase() + next.slice(1)}`,
    time,
    desc: `Automatic cycle update. Signal changed to ${next}.`,
    iconType: 'traffic',
    color: next === 'green' ? 'emerald' : next === 'yellow' ? 'amber' : 'rose',
    tags: ['Auto Cycle'],
  };
  insertLog(newLog);
  io.emit('newLog', newLog);

  // Push notification
  const notif = { id: Date.now(), message: `Signal changed to ${next.toUpperCase()} at ${time}`, type: next, read: false };
  notifications.unshift(notif);
  if (notifications.length > 20) notifications.pop();
  io.emit('notificationsUpdate', notifications);
}

let autoInterval = setInterval(rotateSignal, 5000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`CityPulse backend running on http://localhost:${PORT}`));
