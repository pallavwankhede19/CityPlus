import 'package:google_maps_flutter/google_maps_flutter.dart';

enum SignalPhase { red, yellow, green }

class TrafficSignal {
  final String id;
  final LatLng location;
  SignalPhase phase;
  int countdown;

  TrafficSignal({
    required this.id,
    required this.location,
    required this.phase,
    required this.countdown,
  });

  factory TrafficSignal.fromJson(Map<String, dynamic> json) {
    // Map backend string state to enum
    final String stateStr = (json['state'] ?? 'GREEN').toString().toLowerCase();
    SignalPhase phase = SignalPhase.green;
    if (stateStr == 'red') phase = SignalPhase.red;
    if (stateStr == 'yellow') phase = SignalPhase.yellow;

    return TrafficSignal(
      id: json['id'] ?? json['intersection_id'] ?? 'unknown',
      location: LatLng(
        (json['lat'] ?? json['latitude'] ?? 0.0).toDouble(),
        (json['lng'] ?? json['longitude'] ?? 0.0).toDouble(),
      ),
      phase: phase,
      countdown: json['timer'] ?? json['remaining_time'] ?? 0,
    );
  }
}
