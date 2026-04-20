import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class GoogleMapsApiService {
  final Dio _dio = Dio();
  final String? _apiKey = dotenv.env['GOOGLE_MAPS_API_KEY'];

  String? get apiKey => _apiKey;

  /// Fetches route directions using the MODERN Routes API v1.
  Future<Map<String, dynamic>?> getDirections(LatLng origin, LatLng destination) async {
    const String url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    
    try {
      final response = await _dio.post(
        url,
        data: {
          "origin": {
            "location": {
              "latLng": {"latitude": origin.latitude, "longitude": origin.longitude}
            }
          },
          "destination": {
            "location": {
              "latLng": {"latitude": destination.latitude, "longitude": destination.longitude}
            }
          },
          "travelMode": "DRIVE",
          "routingPreference": "TRAFFIC_AWARE",
          "languageCode": "en-US",
        },
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': _apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.viewport,routes.legs.steps',
          },
        ),
      );

      if (response.statusCode == 200 && response.data['routes'] != null) {
        final route = response.data['routes'][0];
        
        // Parse duration (e.g., "540s") into minutes string
        final secondsStr = route['duration'].replaceAll('s', '');
        final minutes = (int.parse(secondsStr) / 60).ceil();
        
        // Parse distance (meters) to KM
        final distanceKm = (route['distanceMeters'] / 1000).toStringAsFixed(1);

        // Extract and Normalize steps for the direction list
        final rawSteps = route['legs']?[0]['steps'] ?? [];
        final normalizedSteps = (rawSteps as List).map((s) {
          return {
            'html_instructions': s['navigationInstruction']?['instructions'] ?? 'Follow route',
            'distance': {
              'text': '${((s['distanceMeters'] ?? 0) / 1000).toStringAsFixed(1)} km',
              'value': s['distanceMeters'] ?? 0
            },
          };
        }).toList();

        return {
          'polyline': route['polyline']['encodedPolyline'],
          'distance': '$distanceKm KM',
          'distanceMeters': route['distanceMeters'] ?? 0,
          'duration': '$minutes MIN',
          'bounds': route['viewport'],
          'steps': normalizedSteps,
        };
      }
    } catch (e) {
      if (e is DioException) {
        print('[CITYPULSE ERROR] Routes API Exception Body: ${e.response?.data}');
      }
      print('[CITYPULSE ERROR] Routes API Exception: $e');
    }

    return null;
  }

  /// Fetches autocomplete suggestions using the MODERN Places API (New) v1.
  Future<List<dynamic>> getAutocompleteSuggestions(String input) async {
    const String url = 'https://places.googleapis.com/v1/places:autocomplete';
    
    if (_apiKey == null || _apiKey!.isEmpty) return [];

    try {
      final response = await _dio.post(
        url,
        data: {
          "input": input,
          "includeQueryPredictions": true,
          "languageCode": "en-US",
        },
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': _apiKey,
          },
        ),
      );

      if (response.statusCode == 200) {
        if (response.data['suggestions'] != null) {
          // Flatten the modern nested structure for the UI
          return (response.data['suggestions'] as List).map((s) {
            final prediction = s['placePrediction'];
            return {
              'description': prediction?['text']?['text'] ?? 'Unknown Location',
              'place_id': prediction?['place'] ?? '', // This is the 'places/CH_ID' resource name
            };
          }).toList();
        } else {
          final status = response.data['status'] ?? 'UNKNOWN';
          final msg = response.data['errorMessage'] ?? 'No detail';
          throw '[CITYPULSE ERROR] Google Status: $status - $msg';
        }
      }
    } catch (e) {
      if (e is DioException) {
        print('[CITYPULSE ERROR] Places Autocomplete Exception Body: ${e.response?.data}');
      }
      print('[CITYPULSE ERROR] Places Autocomplete Exception: $e');
      rethrow;
    }

    return [];
  }


  /// Fetches place details (specifically coordinates) using the MODERN Places API (New) v1.
  Future<LatLng?> getPlaceDetails(String placeId) async {
    // In Places API (New), placeId is often passed as a name resource: places/{place_id}
    final String url = 'https://places.googleapis.com/v1/$placeId';
    
    try {
      final response = await _dio.get(
        url,
        options: Options(
          headers: {
            'X-Goog-Api-Key': _apiKey,
            'X-Goog-FieldMask': 'location',
          },
        ),
      );

      if (response.statusCode == 200 && response.data['location'] != null) {
        final location = response.data['location'];
        return LatLng(location['latitude'], location['longitude']);
      }
    } catch (e) {
      print('[CITYPULSE ERROR] Place Details Exception: $e');
    }
    return null;
  }
}
