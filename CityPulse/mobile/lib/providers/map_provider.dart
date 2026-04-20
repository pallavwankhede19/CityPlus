import 'dart:math';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_polyline_points/flutter_polyline_points.dart';
import 'package:geolocator/geolocator.dart';
import '../services/location_service.dart';
import '../services/google_maps_api.dart';
import '../services/backend_api_service.dart';
import '../services/socket_service.dart';
import '../models/traffic_signal.dart';
import '../utils/marker_generator.dart';

import 'package:intl/intl.dart';

enum AppState { idle, searching, routing, navigating, voicePrompt }

class MapProvider with ChangeNotifier {
  final LocationService _locationService = LocationService();
  final GoogleMapsApiService _googleApiService = GoogleMapsApiService();
  final BackendApiService _backendApiService = BackendApiService();
  final SocketService _socketService = SocketService();
  Timer? _heartbeatTimer;

  AppState _state = AppState.idle;
  AppState get state => _state;

  String _selectedTransportMode = 'car';
  String get selectedTransportMode => _selectedTransportMode;

  String _originName = 'Your Location';
  String get originName => _originName;

  String _destinationName = '';
  String get destinationName => _destinationName;

  bool _isSearchingOrigin = false;
  bool get isSearchingOrigin => _isSearchingOrigin;

  void setIsSearchingOrigin(bool value) {
    _isSearchingOrigin = value;
    notifyListeners();
  }

  LatLng? _currentLocation;
  LatLng? get currentLocation => _currentLocation;

  LatLng? _destinationLocation;
  LatLng? get destinationLocation => _destinationLocation;

  LatLngBounds? _routeBounds;
  LatLngBounds? get routeBounds => _routeBounds;

  Set<Polyline> _polylines = {};
  Set<Polyline> get polylines => _polylines;

  double _distanceMeters = 0;
  double _durationSeconds = 0;

  String _distance = '';
  String get distance => _distance;

  String _duration = '';
  String get duration => _duration;

  String get arrivalTime {
    if (_durationSeconds == 0) return "10:30 AM";
    final now = DateTime.now();
    final arrival = now.add(Duration(seconds: _durationSeconds.toInt()));
    return DateFormat('hh:mm a').format(arrival);
  }

  String get tripCost {
    if (_distanceMeters == 0) return "₹ 0";
    final cost = (_distanceMeters / 1000) * (106 / 15);
    return "₹ ${cost.toStringAsFixed(0)}";
  }

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  List<dynamic> _suggestions = [];
  List<dynamic> get suggestions => _suggestions;

  List<dynamic> _routeSteps = [];
  int _currentSpeed = 0; // 🛰️ Real-time speed starts at zero

  List<dynamic> get routeSteps => _routeSteps;
  int get currentSpeed => _currentSpeed;

  String get currentInstruction {
    if (_routeSteps.isEmpty) return "Keep straight";
    return _routeSteps[0]['instruction'] ?? "Keep straight";
  }

  String get subInstruction {
    if (_routeSteps.isEmpty) return "onto main route";
    return _routeSteps[0]['street_name'] ?? "onto main route";
  }

  List<dynamic> _alternativeRoutes = [];
  int _selectedRouteIndex = 0;

  List<TrafficSignal> _signals = [];
  List<TrafficSignal> get signals => _signals;

  Set<Marker> _signalMarkers = {};
  Set<Marker> get signalMarkers => _signalMarkers;

  int get signalCount => _signals.length;

  TrafficSignal? _activeSignal;
  TrafficSignal? get activeSignal => _activeSignal;

  double _distanceToActiveSignal = 10000; // Default far
  double get distanceToActiveSignal => _distanceToActiveSignal;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  MapProvider() {
    _initSocket();
    _listenToLocation();
  }

  void _listenToLocation() {
    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 2,
      ),
    ).listen((Position position) {
      _currentLocation = LatLng(position.latitude, position.longitude);
      _socketService.updateLocation(position.latitude, position.longitude);
      
      if (position.speed >= 0) {
        _currentSpeed = (position.speed * 3.6).round();
      }

      // 🗺️ DYNAMIC NAVIGATION INSTRUCTIONS
      if (_state == AppState.navigating && _routeSteps.isNotEmpty) {
        final step = _routeSteps[0];
        final stepLocation = LatLng(
          step['end_location']['lat'], 
          step['end_location']['lng']
        );
        double distToStepEnd = _calculateDistance(_currentLocation!, stepLocation);
        
        // If we are within 20 meters of the step end, move to the next instruction
        if (distToStepEnd < 20) {
          _routeSteps.removeAt(0);
        }
      }

      // 🛰️ SIGNAL PROXIMITY RADAR
      if (_signals.isNotEmpty) {
        TrafficSignal? nearestAhead;
        double minDistance = 10000;

        for (var signal in _signals) {
          double dist = _calculateDistance(_currentLocation!, signal.location);
          // If signal is ahead (between 15m and 600m)
          if (dist > 15 && dist < 600 && dist < minDistance) {
            minDistance = dist;
            nearestAhead = signal;
          }
        }

        _activeSignal = nearestAhead;
        _distanceToActiveSignal = minDistance;
      } else {
        _activeSignal = null;
        _distanceToActiveSignal = 10000;
      }

      notifyListeners();
    });
  }

  double _calculateDistance(LatLng p1, LatLng p2) {
    var p = 0.017453292519943295;
    var c = cos;
    var a = 0.5 - c((p2.latitude - p1.latitude) * p) / 2 +
        c(p1.latitude * p) * c(p2.latitude * p) *
            (1 - c((p2.longitude - p1.longitude) * p)) / 2;
    return 12742 * asin(sqrt(a)) * 1000; // Result in Meters
  }

  void _initSocket() {
    _socketService.initSocket((data) {
      _handleSocketUpdate(data);
    });
  }

  void _handleSocketUpdate(dynamic data) {
    if (_signals.isEmpty) return;

    // 🚀 NEW: Handle regional bulk updates (Package of 100+)
    List<dynamic> updates = [];
    if (data.containsKey('updates')) {
      updates = data['updates'];
    } else {
      // Fallback for single legacy updates
      updates = [data];
    }

    bool updated = false;

    for (var update in updates) {
      final String? intersectionId = update['intersection_id'];
      
      // Find matching signal on our route
      for (var signal in _signals) {
        if (signal.id == intersectionId) {
          final Map<String, dynamic> signalsMap = update['signals'] ?? {};
          
          // 🛰️ SMART INTERPRETER: Extract state and countdown
          String? stateStr;
          int? countdown;

          if (signalsMap.containsKey('state')) {
            stateStr = signalsMap['state'];
            countdown = signalsMap['remaining_time'] ?? signalsMap['timer'];
          } else if (update.containsKey('signals')) {
             // Handle nested structures like agent.py: { signals: { north: { ... } } }
             final nested = update['signals'] as Map<String, dynamic>;
             if (nested.isNotEmpty) {
               final firstKey = nested.keys.first;
               stateStr = nested[firstKey]['state'];
               countdown = nested[firstKey]['remaining_time'] ?? nested[firstKey]['timer'];
             }
          }

          if (stateStr != null) {
            signal.phase = (stateStr.toLowerCase() == 'red') ? SignalPhase.red : SignalPhase.green;
            signal.countdown = countdown ?? 0;
            updated = true;
          }
        }
      }
    }

    if (updated) {
      _rebuildSignalMarkers();
      notifyListeners(); // 🚀 Refresh HUD and Markers
    }
  }

  Future<void> _rebuildSignalMarkers() async {
    Set<Marker> newMarkers = {};

    for (var signal in _signals) {
      final icon = await MarkerGenerator.createSignalIcon(
        phase: signal.phase.index == SignalPhase.red.index ? 0 : 2, 
        size: 180, // High visibility
      );

      newMarkers.add(
        Marker(
          markerId: MarkerId(signal.id),
          position: signal.location,
          icon: icon,
          anchor: const Offset(0.5, 0.5),
        ),
      );
    }
    _signalMarkers = newMarkers;
    notifyListeners();
  }

  void setState(AppState newState) {
    _state = newState;
    notifyListeners();
  }

  Future<void> initLocation() async {
    try {
      Position position = await _locationService.getCurrentLocation();
      _currentLocation = LatLng(position.latitude, position.longitude);
      _state = AppState.idle;
      notifyListeners();
    } catch (e) {
      print('[CITYPULSE ERROR] Init Location Error: $e');
    }
  }

  Future<void> searchPlaces(String input) async {
    if (input.isEmpty) {
      _suggestions = [];
      notifyListeners();
      return;
    }
    _isLoading = true;
    print('[MapProvider] Voice Search: "$input"'); // 🕵️ Log it!
    _suggestions = await _googleApiService.getAutocompleteSuggestions(input);
    print('[MapProvider] Voice Search Result: ${_suggestions.length} places found.');
    _isLoading = false;
    notifyListeners();
  }
  Future<void> setOrigin(String placeId, String description) async {
    _isLoading = true;
    notifyListeners();
    try {
      LatLng? location = await _googleApiService.getPlaceDetails(placeId);
      if (location != null) {
        _currentLocation = location;
        _originName = description;
        // If we already have a destination, re-fetch the route
        if (_destinationLocation != null) {
          await setDestination('re-fetch', _destinationName, destinationOverride: _destinationLocation);
        }
      }
    } catch (e) {
      print('[CITYPULSE ERROR] Set Origin Failure: $e');
    }
    _isLoading = false;
    _isSearchingOrigin = false;
    _suggestions = [];
    notifyListeners();
  }

  Future<void> setDestination(String placeId, String description, {LatLng? destinationOverride}) async {
    _isLoading = true;
    _state = AppState.routing;
    _signals = [];
    _signalMarkers = {};
    _routeSteps = [];
    _destinationName = description;
    notifyListeners();

    try {
      LatLng? destination = destinationOverride ?? await _googleApiService.getPlaceDetails(placeId);
      if (destination != null && _currentLocation != null) {
        _destinationLocation = destination;
        
        // 🚀 CRITICAL: Fetch "Signal Aware" route with a 10-second timeout
        Map<String, dynamic>? backendData;
        try {
          backendData = await _backendApiService
              .getSignalAwareRoute(_currentLocation!, destination)
              .timeout(const Duration(seconds: 10)); // ⏱️ Increased timeout for cold DB
        } catch (e) {
          print('[CITYPULSE] Backend Timeout or Error: $e');
        }
        
        if (backendData != null) {
          print('[CITYPULSE] Backend Handshake Successful');
          final bestRoute = backendData['best_route'];
          final alternatives = backendData['alternatives'] as List? ?? [];
          
          _alternativeRoutes = [bestRoute, ...alternatives];
          _updateActiveRoute(0);
          
          // 🗺️ Use Google only for viewport bounds (as backend doesn't provide them yet)
          final googleData = await _googleApiService.getDirections(_currentLocation!, destination);
          if (googleData != null) {
            final viewport = googleData['bounds'];
            _routeBounds = LatLngBounds(
              southwest: LatLng(viewport['low']['latitude'], viewport['low']['longitude']),
              northeast: LatLng(viewport['high']['latitude'], viewport['high']['longitude']),
            );
          }
        }
 else {
          final googleData = await _googleApiService.getDirections(_currentLocation!, destination);
          if (googleData != null) {
            _distance = googleData['distance'];
            _distanceMeters = (googleData['distanceMeters'] as num?)?.toDouble() ?? 0.0;
            _duration = googleData['duration'];
            _routeSteps = googleData['steps'];
            
            List<PointLatLng> result = PolylinePoints.decodePolyline(googleData['polyline']);
            List<LatLng> polylineCoordinates = result.map((p) => LatLng(p.latitude, p.longitude)).toList();
            
            _polylines = {
              Polyline(
                polylineId: const PolylineId('route'),
                color: const Color(0xFFB0FF92),
                width: 8,
                points: polylineCoordinates,
              )
            };

            final viewport = googleData['bounds'];
            _routeBounds = LatLngBounds(
              southwest: LatLng(viewport['low']['latitude'], viewport['low']['longitude']),
              northeast: LatLng(viewport['high']['latitude'], viewport['high']['longitude']),
            );
            
            // 🚦 Scout for signals along the Google Polyline fallback
            final dynSignals = await _backendApiService.getSignalsForRoute(polylineCoordinates);
            _signals = dynSignals.map((s) => TrafficSignal.fromJson(s)).toList();
            _rebuildSignalMarkers();
          } else {
            _errorMessage = "Unable to calculate route. Check your internet connection.";
          }
        }
      }
    } catch (e) {
      _errorMessage = "Integration Error: $e";
    }
    _isLoading = false;
    _suggestions = [];
    notifyListeners();
  }

  void setTransportMode(String mode) {
    _selectedTransportMode = mode;
    notifyListeners();
    // In a real app, this would re-fetch the route with new travel mode
  }

  void startNavigation() {
    _state = AppState.navigating;
    _rebuildSignalMarkers();
    _startHeartbeat(); // 🚀 [NEW] Start simulated ticking
    notifyListeners();
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      bool changed = false;
      for (var signal in _signals) {
        if (signal.countdown > 0) {
          signal.countdown--;
          changed = true;
        }
      }
      if (changed) notifyListeners();
    });
  }

  void stopNavigation() {
    _state = AppState.routing;
    _heartbeatTimer?.cancel(); // 🛑 Stop ticking
    _activeSignal = null;
    notifyListeners();
  }

  void swapLocations() {
    if (_destinationLocation == null) return;
    
    final tempLoc = _currentLocation;
    _currentLocation = _destinationLocation;
    _destinationLocation = tempLoc;

    final tempName = _originName;
    _originName = _destinationName;
    _destinationName = tempName;

    notifyListeners();
    // Re-fetch direction after swap
    if (_currentLocation != null && _destinationLocation != null) {
      setDestination('swapped', _destinationName, destinationOverride: _destinationLocation); 
    }
  }

  void clearRoute() {
    _destinationLocation = null;
    _polylines = {};
    _signals = [];
    _signalMarkers = {};
    _routeSteps = [];
    _distance = '';
    _duration = '';
    _routeBounds = null;
    _state = AppState.idle;
    notifyListeners();
  }

  void clearSuggestions() {
    _suggestions = [];
    notifyListeners();
  }

  void selectRoute(int index) {
    if (index < 0 || index >= _alternativeRoutes.length) return;
    _selectedRouteIndex = index;
    _updateActiveRoute(index);
    notifyListeners();
  }

  void _updateActiveRoute(int index) {
    final routeData = _alternativeRoutes[index];
    
    // 📊 Update Metrics
    _distanceMeters = (routeData['distance_meters'] ?? 0).toDouble();
    _durationSeconds = (routeData['duration'] ?? 0).toDouble();
    _distance = "${(_distanceMeters / 1000).toStringAsFixed(1)} KM";
    _duration = "${(_durationSeconds / 60).ceil()} MIN";
    
    // 📜 Update Steps from CityPulse Backend
    _routeSteps = routeData['steps'] ?? [];

    // 🚦 Update Signals
    final backendSignals = routeData['signals'] as List? ?? [];
    _signals = backendSignals.map((s) => TrafficSignal.fromJson(s)).toList();
    _rebuildSignalMarkers();

    // 🗺️ Update Polylines with Tap Support
    _polylines = {};
    for (int i = 0; i < _alternativeRoutes.length; i++) {
      final isSelected = (i == index);
      final r = _alternativeRoutes[i];
      List<PointLatLng> result = PolylinePoints.decodePolyline(r['polyline']);
      List<LatLng> coords = result.map((p) => LatLng(p.latitude, p.longitude)).toList();

      _polylines.add(
        Polyline(
          polylineId: PolylineId('route_$i'),
          color: isSelected ? const Color(0xFFB0FF92) : const Color(0xFF8E8E8E).withOpacity(0.5),
          width: isSelected ? 8 : 6,
          points: coords,
          consumeTapEvents: true, // 👆 Allows tapping gray routes
          onTap: () => selectRoute(i), // 🚀 Swaps route on tap
        ),
      );
    }
  }

  bool _isSimulating = false;
  bool get isSimulating => _isSimulating;

  void toggleSimulation() {
    if (_isSimulating) {
      _isSimulating = false;
      notifyListeners();
      return;
    }

    if (_polylines.isEmpty) {
      print('[CITYPULSE] Simulation Failed: No routes available');
      return;
    }
    
    _isSimulating = true;
    _currentSpeed = 40; 
    print('[CITYPULSE] Simulation Started on Route Index: $_selectedRouteIndex');
    notifyListeners();

    // 🚀 Get points from the EXACT selected route
    final activeRouteId = 'route_$_selectedRouteIndex';
    final activeRoute = _polylines.firstWhere(
      (p) => p.polylineId.value == activeRouteId,
      orElse: () => _polylines.first
    );
    final points = activeRoute.points;
    int currentIndex = 0;

    Timer.periodic(const Duration(milliseconds: 500), (timer) {
      if (!_isSimulating || currentIndex >= points.length) {
        timer.cancel();
        _isSimulating = false;
        _currentSpeed = 0;
        notifyListeners();
        return;
      }

      _currentLocation = points[currentIndex];
      _socketService.updateLocation(_currentLocation!.latitude, _currentLocation!.longitude); // 🚀 [NEW] Sync simulator to server
      
      // Update Navigation Instructions
      if (_routeSteps.isNotEmpty) {
        final step = _routeSteps[0];
        final stepLocation = LatLng(
          step['end_location']['lat'], 
          step['end_location']['lng']
        );
        double distToStepEnd = _calculateDistance(_currentLocation!, stepLocation);
        if (distToStepEnd < 20) {
          _routeSteps.removeAt(0);
        }
      }
      // Update Radar Logic manually for simulation
      if (_signals.isNotEmpty) {
        TrafficSignal? nearestAhead;
        double minDistance = 10000;
        for (var signal in _signals) {
          double dist = _calculateDistance(_currentLocation!, signal.location);
          if (dist > 10 && dist < minDistance) {
            minDistance = dist;
            nearestAhead = signal;
          }
        }
        _activeSignal = nearestAhead;
        _distanceToActiveSignal = minDistance;
      }

      currentIndex++;
      notifyListeners();
    });
  }
}
