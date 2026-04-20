import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  late IO.Socket socket;
  // Force correct IP for stability
  final String _socketUrl = 'http://172.16.21.80:3000';

  void initSocket(Function(dynamic) onUpdate) {
    socket = IO.io(_socketUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    socket.onConnect((_) {
      print('[CITYPULSE] Connected to Socket Backend');
    });

    // 🛰️ Synchronized with Regional Grid Pulse (agent.py & backend)
    socket.on('regional_update', (data) {
      onUpdate(data);
    });

    socket.on('intersection_update', (data) {
      onUpdate(data);
    });

    socket.onDisconnect((_) => print('[CITYPULSE] Disconnected from Socket Backend'));
  }

  void updateLocation(double lat, double lng) {
    if (socket.connected) {
      socket.emit('user_location', {'lat': lat, 'lng': lng});
    }
  }

  void dispose() {
    socket.disconnect();
  }
}
