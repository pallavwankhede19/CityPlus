'use strict';

let ioInstance = null;

function setIo(io) {
  ioInstance = io;

  // 🛰️ REGIONAL RELAY: When the AI Agent (a client) emits its 1Hz heart-beat,
  // we relay it to all other connected clients (like the phone).
  const userLocations = new Map(); // socket.id -> {lat, lng}

  io.on('connection', (socket) => {
    // 🛰️ Track user location for proximity filtering
    socket.on('user_location', (data) => {
      userLocations.set(socket.id, data);
    });

    socket.on('disconnect', () => {
      userLocations.delete(socket.id);
    });

    socket.on('regional_update', (data) => {
      if (!data.updates) return;

      // 🚀 PRECISION PULSE: Instead of broadcast, we unicast to each relevant user
      for (const [id, clientSocket] of io.sockets.sockets) {
        const userLoc = userLocations.get(id);
        
        if (!userLoc) {
          // If no location known, send first 50 as fallback
          clientSocket.emit('regional_update', { updates: data.updates.slice(0, 50) });
          continue;
        }

        // Filter: Only signals within ~5km for smoother regional transitions
        const localUpdates = data.updates.filter(update => {
          const dLat = update.lat - userLoc.lat;
          const dLng = update.lon - userLoc.lng;
          // Simple squared distance check (approx 0.05 deg ~ 5.5km)
          return (dLat * dLat + dLng * dLng) < 0.0025;
        });

        if (localUpdates.length > 0) {
          clientSocket.emit('regional_update', { updates: localUpdates });
        }
      }
    });
  });
}

function getIo() {
  return ioInstance;
}

module.exports = { setIo, getIo };
