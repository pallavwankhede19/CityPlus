import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/map_provider.dart';
import '../theme/app_colors.dart';
import '../core/map_styles.dart';

class DirectionsListScreen extends StatefulWidget {
  const DirectionsListScreen({super.key});

  @override
  State<DirectionsListScreen> createState() => _DirectionsListScreenState();
}

class _DirectionsListScreenState extends State<DirectionsListScreen> {
  GoogleMapController? _mapController;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Direction List', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Consumer<MapProvider>(
        builder: (context, mapProvider, child) {
          return Stack(
            children: [
              // 🗺️ Premium Dark Map
              _buildMap(mapProvider),

              // 🏁 Top Focus Step Card
              if (mapProvider.routeSteps.isNotEmpty)
                _buildFocusStepCard(mapProvider.routeSteps[0]),

              // 📊 Floating Route Intelligence Card (Image 1 Style)
              _buildFloatingSummary(mapProvider),

              // 📜 Scrollable Steps List
              _buildDraggableSteps(mapProvider),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFloatingSummary(MapProvider mapProvider) {
    return Positioned(
      bottom: 230, // Above the draggable sheet
      left: 16,
      right: 16,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF161616).withOpacity(0.9),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            mapProvider.duration,
                            style: const TextStyle(color: Color(0xFF22C55E), fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: -1),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: Colors.orange.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                            child: Row(
                              children: [
                                const Icon(Icons.traffic_rounded, size: 14, color: Colors.orange),
                                const SizedBox(width: 4),
                                Text('${mapProvider.signalCount}', style: const TextStyle(color: Colors.orange, fontSize: 13, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${mapProvider.distance} • Arrive ${mapProvider.arrivalTime}',
                        style: const TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    mapProvider.startNavigation();
                    Navigator.pushNamed(context, '/navigation');
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00563A), // Dark Forest Green
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [BoxShadow(color: const Color(0xFF00563A).withOpacity(0.4), blurRadius: 15)],
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.navigation_rounded, color: Colors.white, size: 20),
                        SizedBox(width: 8),
                        Text('START', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15, letterSpacing: 0.5)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMap(MapProvider mapProvider) {
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: mapProvider.currentLocation ?? mapProvider.destinationLocation!, 
        zoom: 15,
        tilt: 45,
      ),
      onMapCreated: (controller) {
        _mapController = controller;
        // 🚀 Reverted to Google Classic Light Theme
        // _mapController?.setMapStyle(MapStyles.dark); 
      },
      polylines: mapProvider.polylines,
      markers: mapProvider.signalMarkers,
      zoomControlsEnabled: false,
      myLocationButtonEnabled: false,
      mapToolbarEnabled: false,
    );
  }

  Widget _buildFocusStepCard(dynamic step) {
    final htmlText = step['html_instructions'] ?? '';
    final cleanText = htmlText.replaceAll(RegExp(r'<[^>]*>|&[^;]+;'), '');
    final distanceText = step['distance']['text'] ?? '';

    return Positioned(
      top: 20,
      left: 20,
      right: 20,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF1E1E1E).withOpacity(0.9),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle),
                  child: const Icon(Icons.turn_left, color: Color(0xFF22C55E), size: 32),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cleanText,
                        style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(distanceText, style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 16)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDraggableSteps(MapProvider mapProvider) {
    return DraggableScrollableSheet(
      initialChildSize: 0.25,
      minChildSize: 0.15,
      maxChildSize: 0.7,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.95),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  itemCount: mapProvider.routeSteps.length,
                  itemBuilder: (context, index) {
                    final s = mapProvider.routeSteps[index];
                    final text = s['html_instructions'].replaceAll(RegExp(r'<[^>]*>|&[^;]+;'), '');
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Row(
                        children: [
                          Icon(Icons.navigation, color: Colors.white.withOpacity(0.3), size: 20),
                          const SizedBox(width: 20),
                          Expanded(
                            child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 15)),
                          ),
                          Text(s['distance']['text'], style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 12)),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
