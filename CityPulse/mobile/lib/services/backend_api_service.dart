import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class BackendApiService {
  final Dio _dio = Dio();
  // Force correct IP for stability
  final String _baseUrl = 'http://172.16.21.80:3000/api';

  /// Fetches a signal-aware route from the Python/Node backend.
  Future<Map<String, dynamic>?> getSignalAwareRoute(LatLng origin, LatLng destination) async {
    try {
      final response = await _dio.post(
        '$_baseUrl/mobile/route',
        data: {
          'origin': {'lat': origin.latitude, 'lng': origin.longitude},
          'destination': {'lat': destination.latitude, 'lng': destination.longitude},
        },
      );

      if (response.statusCode == 200) {
        return response.data;
      }
    } catch (e) {
      print('[CITYPULSE ERROR] Backend API Failure: $e');
    }
    return null;
  }

  /// Fetches signals along a specific polyline (Signal Scouting)
  Future<List<dynamic>> getSignalsForRoute(List<LatLng> polyline) async {
    try {
      final response = await _dio.post(
        '$_baseUrl/mobile/scout-signals',
        data: {
          'polyline': polyline.map((p) => {'lat': p.latitude, 'lng': p.longitude}).toList(),
        },
      );
      if (response.statusCode == 200) {
        return response.data['signals'] ?? [];
      }
    } catch (e) {
      print('[CITYPULSE ERROR] Signal Scouting Failure: $e');
    }
    return [];
  }
}
