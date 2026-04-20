import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/map_provider.dart';
import '../theme/app_colors.dart';
import '../core/map_styles.dart';
import '../models/traffic_signal.dart';

class NavigationScreen extends StatefulWidget {
  const NavigationScreen({super.key});

  @override
  State<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends State<NavigationScreen> {
  GoogleMapController? _mapController;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Consumer<MapProvider>(
        builder: (context, mapProvider, child) {
          return Stack(
            children: [
              // 🗺️ 3D Navigation Map
              _buildMap(mapProvider),

              // 🚁 Top Instruction HUD (White Frosted - Image 3)
              Positioned(
                top: 60,
                left: 20,
                right: 20,
                child: _buildTopInstructionHUD(mapProvider),
              ),

              // 🚦 Smart Signal Countdown HUD (Appears within 600m as requested)
              if (mapProvider.activeSignal != null && mapProvider.distanceToActiveSignal < 600)
                Positioned(
                  top: 170, 
                  left: 40,
                  right: 40,
                  child: _buildSignalCountdownOverlay(mapProvider),
                ),

              // 📊 Bottom Stats HUD (White Pill - Image 3)
              Positioned(
                bottom: 40,
                left: 100,
                right: 20,
                child: _buildBottomStatsHUD(mapProvider),
              ),

              // ❌ Exit Button (Bottom Left)
              Positioned(
                bottom: 40,
                left: 24,
                child: _buildExitButton(() {
                  mapProvider.clearRoute();
                  Navigator.of(context).pop(); // 🚀 Return to Home Search
                }),
              ),

              // 🎯 RECENTER & SIMULATION CONTROLS (Right Side)
              Positioned(
                bottom: 130, // Above the Stats HUD
                right: 20,
                child: Column(
                  children: [
                    FloatingActionButton.small(
                      heroTag: 'recenter',
                      backgroundColor: Colors.white,
                      onPressed: () {
                        if (mapProvider.currentLocation != null && _mapController != null) {
                          _mapController!.animateCamera(
                            CameraUpdate.newLatLng(mapProvider.currentLocation!),
                          );
                        }
                      },
                      child: const Icon(Icons.my_location, color: Color(0xFF00563A)),
                    ),
                    const SizedBox(height: 16),
                    FloatingActionButton.small(
                      heroTag: 'sim',
                      onPressed: () => mapProvider.toggleSimulation(),
                      backgroundColor: mapProvider.isSimulating ? const Color(0xFF22C55E) : Colors.white,
                      child: Icon(
                        mapProvider.isSimulating ? Icons.stop_circle : Icons.play_circle_filled,
                        color: mapProvider.isSimulating ? Colors.white : const Color(0xFF00563A),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMap(MapProvider mapProvider) {
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: mapProvider.currentLocation!,
        zoom: 18,
        tilt: 45,
        bearing: 30,
      ),
      onMapCreated: (controller) {
        _mapController = controller;
        // 🛰️ Auto-follow logic for Simulation/GPS
        mapProvider.addListener(() {
          if (mapProvider.currentLocation != null && _mapController != null) {
            _mapController!.animateCamera(
              CameraUpdate.newLatLng(mapProvider.currentLocation!),
            );
          }
        });
      },
      myLocationEnabled: true,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      polylines: mapProvider.polylines,
      markers: mapProvider.signalMarkers,
    );
  }

  Widget _buildSignalCountdownOverlay(MapProvider mapProvider) {
    final signal = mapProvider.activeSignal!;
    final isRed = signal.phase == SignalPhase.red;
    final accentColor = isRed ? const Color(0xFFFF3B30) : const Color(0xFF22C55E);

    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 500),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.8),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: accentColor.withOpacity(0.5), width: 2),
            boxShadow: [
              BoxShadow(color: accentColor.withOpacity(0.2), blurRadius: 20),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(
                    isRed ? Icons.stop_rounded : Icons.play_arrow_rounded,
                    color: accentColor,
                    size: 40,
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      isRed ? 'NEXT RED CLEARS' : 'GREEN WAVE',
                      style: TextStyle(
                        color: accentColor, 
                        fontWeight: FontWeight.w900, 
                        fontSize: 13, 
                        letterSpacing: 1,
                      ),
                    ),
                    Text(
                      '${mapProvider.distanceToActiveSignal.round()}m to Junction',
                      style: const TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ),
              ),
              Text(
                '${signal.countdown}',
                style: TextStyle(
                  color: accentColor, 
                  fontSize: 42, 
                  fontWeight: FontWeight.w900, 
                  height: 1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopInstructionHUD(MapProvider mapProvider) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(32),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.85),
            borderRadius: BorderRadius.circular(32),
            border: Border.all(color: Colors.black.withOpacity(0.05)),
          ),
          child: Row(
            children: [
              const Icon(Icons.turn_right_rounded, color: Color(0xFF00563A), size: 42),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      mapProvider.currentInstruction, 
                      style: const TextStyle(
                        color: Color(0xFF00563A), 
                        fontSize: 22, 
                        fontWeight: FontWeight.w900, 
                        letterSpacing: -0.5,
                      ),
                    ),
                    Text(
                      mapProvider.subInstruction, 
                      style: const TextStyle(color: Colors.black54, fontSize: 16),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E9E1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.traffic_rounded, size: 20, color: Color(0xFF00563A)),
                    const SizedBox(width: 6),
                    Text(
                      '${mapProvider.signalCount}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold, 
                        fontSize: 16, 
                        color: Color(0xFF00563A),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomStatsHUD(MapProvider mapProvider) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(40),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
        child: Container(
          height: 70,
          padding: const EdgeInsets.symmetric(horizontal: 32),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.85),
            borderRadius: BorderRadius.circular(40),
            border: Border.all(color: Colors.black.withOpacity(0.05)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMetricItem(mapProvider.distance.split(' ')[0], 'KM'),
              _buildVerticalDivider(),
              _buildMetricItem(mapProvider.duration.split(' ')[0], 'MIN'),
              _buildVerticalDivider(),
              _buildMetricItem('${mapProvider.currentSpeed}', 'KM/H'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricItem(String value, String unit) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF003D29))),
        const SizedBox(width: 4),
        Text(unit, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black38)),
      ],
    );
  }

  Widget _buildVerticalDivider() {
    return Container(width: 1, height: 20, color: Colors.black.withOpacity(0.1));
  }

  Widget _buildExitButton(VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20)],
        ),
        child: const Icon(Icons.close, color: Colors.red, size: 32),
      ),
    );
  }
}
