const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'citypulse.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS signal (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    value TEXT NOT NULL DEFAULT 'green'
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS zones (
    name TEXT PRIMARY KEY,
    percentage INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY,
    title TEXT,
    time TEXT,
    desc TEXT,
    iconType TEXT,
    color TEXT,
    tags TEXT
  );
`);

// Seed default data if empty
const signalRow = db.prepare('SELECT * FROM signal WHERE id = 1').get();
if (!signalRow) {
  db.prepare('INSERT INTO signal (id, value) VALUES (1, ?)').run('green');
}

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, name, lat, lng) VALUES (?, ?, ?, ?)');
  insertUser.run(1, 'User 1', 40.7128, -74.0060);
  insertUser.run(2, 'User 2', 40.7138, -74.0040);
  insertUser.run(3, 'User 3', 40.7118, -74.0080);
}

const zoneCount = db.prepare('SELECT COUNT(*) as c FROM zones').get().c;
if (zoneCount === 0) {
  const insertZone = db.prepare('INSERT INTO zones (name, percentage) VALUES (?, ?)');
  insertZone.run('Downtown Core', 88);
  insertZone.run('Industrial North', 42);
  insertZone.run('West End Residence', 65);
  insertZone.run('Tech Park', 29);
}

const logCount = db.prepare('SELECT COUNT(*) as c FROM logs').get().c;
if (logCount === 0) {
  const insertLog = db.prepare('INSERT INTO logs (id, title, time, desc, iconType, color, tags) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertLog.run(1, 'Signal turned Green', '14:22:45', 'Junction 42 - 5th Avenue & Main. Automatic throughput optimization active.', 'traffic', 'emerald', JSON.stringify(['Optimal Flow', 'Zone A']));
  insertLog.run(2, 'Emergency Vehicle Override', '14:18:12', 'Priority corridor cleared for Ambulance unit #429.', 'bolt', 'amber', JSON.stringify(['Critical Priority', 'Hospital Zone']));
  insertLog.run(3, 'Signal turned Red', '14:15:01', 'Junction 19 - East Gate. Congestion relief initiated.', 'traffic', 'rose', JSON.stringify(['Capacity Management', 'Zone C']));
}

// Helpers
const getSignal = () => db.prepare('SELECT value FROM signal WHERE id = 1').get().value;
const setSignal = (val) => db.prepare('UPDATE signal SET value = ? WHERE id = 1').run(val);

const getUsers = () => db.prepare('SELECT * FROM users').all();
const getZones = () => db.prepare('SELECT * FROM zones').all();

const getLogs = () => {
  const rows = db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 50').all();
  return rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
};

const insertLog = (log) => {
  db.prepare('INSERT INTO logs (id, title, time, desc, iconType, color, tags) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(log.id, log.title, log.time, log.desc, log.iconType, log.color, JSON.stringify(log.tags || []));
};

const updateZones = (zones) => {
  const update = db.prepare('UPDATE zones SET percentage = ? WHERE name = ?');
  zones.forEach(z => update.run(z.percentage, z.name));
};

module.exports = { db, getSignal, setSignal, getUsers, getZones, getLogs, insertLog, updateZones };
