import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/map_provider.dart';
import '../services/assistant_service.dart';
import '../theme/app_colors.dart';
import '../core/map_styles.dart';

class HomeMapScreen extends StatefulWidget {
  const HomeMapScreen({super.key});

  @override
  State<HomeMapScreen> createState() => _HomeMapScreenState();
}

class _HomeMapScreenState extends State<HomeMapScreen> {
  GoogleMapController? _mapController;
  MapType _mapType = MapType.hybrid;
  bool _hasInitialFocus = false;
  bool _isFullScreen = false;

  final TextEditingController _originController = TextEditingController();
  final TextEditingController _destController = TextEditingController();

  @override
  void dispose() {
    _originController.dispose();
    _destController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<MapProvider>(context, listen: false).initLocation();
    });
  }

  void _toggleMapType() {
    setState(() {
      _mapType = (_mapType == MapType.hybrid) ? MapType.normal : MapType.hybrid;
    });
  }

  void _recenter() {
    final mapProvider = Provider.of<MapProvider>(context, listen: false);
    if (mapProvider.currentLocation != null && _mapController != null) {
      // 🚀 SAFETY: Only animate if the controller exists and hasn't been disposed
      if (_mapController != null) {
        try {
          _mapController!.animateCamera(
            CameraUpdate.newCameraPosition(
              CameraPosition(target: mapProvider.currentLocation!, zoom: 16),
            ),
          );
        } catch (e) {
          print("Map Controller was disposed, skipping animation.");
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Consumer<MapProvider>(
        builder: (context, mapProvider, child) {
          if (mapProvider.currentLocation == null) {
            return const Center(child: CircularProgressIndicator(color: AppColors.primary));
          }

          // 🎯 Auto-focus only once on first load
          if (!_hasInitialFocus && _mapController != null && mapProvider.currentLocation != null) {
            _hasInitialFocus = true;
            _recenter();
          }

          return Stack(
            children: [
              // 🗺️ The Map (Satellite Default)
              _buildMap(mapProvider),

              // 🚆 Transport Mode Bar (Top-most)
              if (mapProvider.state == AppState.routing)
                Positioned(
                  top: 40, 
                  left: 0, 
                  right: 0, 
                  child: AnimatedOpacity(
                    opacity: _isFullScreen ? 0 : 1,
                    duration: const Duration(milliseconds: 300),
                    child: _buildTransportModeBar(mapProvider),
                  )
                ),

              // 🔍 Search UX / Dual Card

              // 📧 Blue Banner (Below Search)
              if (mapProvider.state == AppState.routing)
                AnimatedPositioned(
                  top: _isFullScreen ? -100 : 225,
                  left: 16,
                  right: 16,
                  duration: const Duration(milliseconds: 400),
                  child: _buildBannerNotification(),
                ),

              // 💬 Map info bubble (mid-route)
              // 💬 Map info bubble (mid-route) - ONLY show when not searching
              if (mapProvider.state == AppState.routing && mapProvider.suggestions.isEmpty)
                _buildRouteInfoBubble(mapProvider),

              // 🎯 Floating Controls (Right Side)
              Positioned(
                bottom: mapProvider.state == AppState.routing ? 220 : 40,
                right: _isFullScreen ? -80 : 16,
                child: AnimatedOpacity(
                  opacity: _isFullScreen ? 0 : 1,
                  duration: const Duration(milliseconds: 300),
                  child: Column(
                    children: [
                      _buildCircularActionButton(Icons.layers_outlined, _toggleMapType),
                      const SizedBox(height: 12),
                      _buildCircularActionButton(Icons.navigation_outlined, _recenter),
                      const SizedBox(height: 12),
                      _buildCircularActionButton(Icons.my_location, _recenter),
                    ],
                  ),
                ),
              ),

              // 🏁 Routing Action Controls (Image 1 Style)
              if (mapProvider.state == AppState.routing && mapProvider.suggestions.isEmpty)
                AnimatedPositioned(
                  bottom: _isFullScreen ? -300 : 40,
                  left: 16,
                  right: 16,
                  duration: const Duration(milliseconds: 400),
                  child: _buildRoutingControls(mapProvider),
                ),

              // 🔍 Search UX / Dual Card - MOVED TO TOP LAYER
              AnimatedPositioned(
                top: _isFullScreen ? -200 : (mapProvider.state == AppState.routing ? 100 : 60),
                left: 16,
                right: 16,
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeInOut,
                child: _buildSearchSection(mapProvider),
              ),

              // 🚨 Error Feedback
              if (mapProvider.errorMessage != null)
                Positioned(
                  top: 120,
                  left: 20,
                  right: 20,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.red.withOpacity(0.8), borderRadius: BorderRadius.circular(12)),
                    child: Text(mapProvider.errorMessage!, style: const TextStyle(color: Colors.white)),
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
      initialCameraPosition: CameraPosition(target: mapProvider.currentLocation!, zoom: 15),
      onMapCreated: (controller) {
        _mapController = controller;
        controller.setMapStyle(MapStyles.dark);
      },
      onTap: (_) {
        setState(() {
          _isFullScreen = !_isFullScreen;
        });
      },
      mapType: _mapType,
      myLocationEnabled: true,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      polylines: mapProvider.polylines,
      markers: mapProvider.signalMarkers,
    );
  }

  Widget _buildSearchSection(MapProvider mapProvider) {
    if (mapProvider.state == AppState.routing) {
      return _buildDualSearchCard(mapProvider);
    }

    return Column(
      children: [
        Row(
          children: [
            _buildCircularTopButton(Icons.menu, () {}),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 15, offset: const Offset(0, 4))
                  ],
                ),
                child: TextField(
                  style: const TextStyle(color: Colors.black87),
                  decoration: InputDecoration(
                    hintText: 'Search destination...',
                    hintStyle: const TextStyle(color: Colors.black38, fontSize: 14),
                    prefixIcon: const Icon(Icons.search, color: Colors.black54, size: 20),
                    suffixIcon: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.black54, size: 20),
                          onPressed: () => mapProvider.searchPlaces(''),
                        ),
                        IconButton(
                          icon: const Icon(Icons.mic, color: Colors.black54, size: 20),
                          onPressed: _showVoiceAssistant,
                        ),
                      ],
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 12),
                    fillColor: Colors.transparent,
                    filled: true,
                  ),
                  onTap: () => mapProvider.searchPlaces(''),
                  onChanged: (val) => mapProvider.searchPlaces(val),
                ),
              ),
            ),
            const SizedBox(width: 12),
            _buildCircularTopButton(Icons.person_outline, () {}),
          ],
        ),
        // Results Dropdown (Standalone Mode)
        if (mapProvider.suggestions.isNotEmpty && mapProvider.state != AppState.routing)
          _buildSearchResults(mapProvider),
      ],
    );
  }

  Widget _buildSearchResults(MapProvider mapProvider) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, left: 60, right: 60),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            color: Colors.black.withOpacity(0.7),
            child: ListView.separated(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              itemCount: mapProvider.suggestions.length,
              separatorBuilder: (c, i) => Divider(color: Colors.white.withOpacity(0.1), height: 1),
              itemBuilder: (context, index) {
                final s = mapProvider.suggestions[index];
                return ListTile(
                  leading: const Icon(Icons.location_on_outlined, color: AppColors.primary),
                  title: Text(s['description'], style: const TextStyle(color: Colors.white, fontSize: 13)),
                  onTap: () {
                    FocusScope.of(context).unfocus();
                    if (mapProvider.isSearchingOrigin) {
                      mapProvider.setOrigin(s['place_id'], s['description']);
                      _originController.text = s['description'];
                    } else {
                      mapProvider.setDestination(s['place_id'], s['description']);
                      _destController.text = s['description'];
                    }
                  },
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTransportModeBar(MapProvider mapProvider) {
    final modes = [
      {'id': 'car', 'icon': Icons.directions_car_filled},
      {'id': 'bike', 'icon': Icons.directions_bike},
      {'id': 'truck', 'icon': Icons.local_shipping},
      {'id': 'walk', 'icon': Icons.directions_walk},
      {'id': 'bus', 'icon': Icons.directions_bus, 'badge': 'New'},
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: modes.map((m) {
        final isSelected = mapProvider.selectedTransportMode == m['id'];
        return GestureDetector(
          onTap: () => mapProvider.setTransportMode(m['id'] as String),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Column(
                children: [
                  Icon(m['icon'] as IconData, color: isSelected ? const Color(0xFF6EC3A7) : Colors.white60, size: 24),
                  const SizedBox(height: 4),
                  if (isSelected) Container(width: 24, height: 2, color: const Color(0xFF6EC3A7)),
                ],
              ),
              if (m.containsKey('badge'))
                Positioned(
                  top: -8,
                  right: -12,
                  child: Text(m['badge'] as String, style: const TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDualSearchCard(MapProvider mapProvider) {
    // 🔄 Sync controllers with provider values if not currently editing
    if (!FocusScope.of(context).hasFocus) {
       _originController.text = mapProvider.originName;
       _destController.text = mapProvider.destinationName;
    }

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20)],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // ⬅️ Back Button + Search Column
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildCircularTopButton(Icons.arrow_back, () {
                mapProvider.clearRoute();
                FocusScope.of(context).unfocus();
              }),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  children: [
                  _buildEditableSearchField(
                    icon: Icons.radio_button_checked,
                    iconColor: const Color(0xFF6EC3A7),
                    controller: _originController,
                    hint: 'Current Location',
                    isDestination: false,
                    onChanged: (val) {
                      mapProvider.setIsSearchingOrigin(true);
                      mapProvider.searchPlaces(val);
                    },
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildEditableSearchField(
                          icon: Icons.location_on,
                          iconColor: const Color(0xFFF1C40F),
                          controller: _destController,
                          hint: 'Search destination...',
                          isDestination: true,
                          onChanged: (val) {
                            mapProvider.setIsSearchingOrigin(false);
                            mapProvider.searchPlaces(val);
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      // 🔄 Swap Button
                      _buildCircularSmallButton(Icons.swap_vert, () {
                        mapProvider.swapLocations();
                        _originController.text = mapProvider.originName;
                        _destController.text = mapProvider.destinationName;
                      }),
                    ],
                  ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildTransportModeToggle(mapProvider),
          const SizedBox(height: 24),
          if (mapProvider.suggestions.isNotEmpty) _buildSearchResults(mapProvider) else _buildSuggestedSection(),
        ],
      ),
    );
  }

  Widget _buildTransportModeToggle(MapProvider mapProvider) {
    return Container(
      height: 64,
      decoration: BoxDecoration(
        color: const Color(0xFFF4F7F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8EDE5)),
      ),
      child: Row(
        children: [
          _buildToggleItem(Icons.directions_car, mapProvider.selectedTransportMode == 'car', () => mapProvider.setTransportMode('car')),
          _buildToggleItem(Icons.directions_bike, mapProvider.selectedTransportMode == 'bike', () => mapProvider.setTransportMode('bike')),
        ],
      ),
    );
  }

  Widget _buildToggleItem(IconData icon, bool isActive, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFFE8F5E9) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: isActive ? Border.all(color: const Color(0xFF2E7D32).withOpacity(0.3)) : null,
          ),
          child: Icon(icon, color: isActive ? const Color(0xFF2E7D32) : Colors.black38, size: 28),
        ),
      ),
    );
  }

  Widget _buildSuggestedSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('SUGGESTED', style: TextStyle(color: Color(0xFF6EC3A7), letterSpacing: 1.5, fontSize: 13, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFF4F7F2), borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.history, color: Colors.black38),
            ),
            const SizedBox(width: 16),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Home', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 16)),
                Text('10 min away', style: TextStyle(color: Colors.black38, fontSize: 14)),
              ],
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildEditableSearchField({
    required IconData icon,
    required Color iconColor,
    required TextEditingController controller,
    required String hint,
    required bool isDestination,
    required Function(String) onChanged,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF9FBF8).withOpacity(0.6), // 🧊 Faint glassmorphic sage
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8EDE5).withOpacity(0.5)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: controller,
              style: const TextStyle(color: Colors.black87, fontSize: 16, fontWeight: FontWeight.w500),
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: const TextStyle(color: Colors.black38, fontSize: 16),
                border: InputBorder.none,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 16),
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (controller.text.isNotEmpty)
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.black26, size: 20),
                        onPressed: () {
                          controller.clear();
                          onChanged('');
                          setState(() {});
                        },
                      ),
                    IconButton(
                      icon: const Icon(Icons.mic, color: Colors.black26, size: 20),
                      onPressed: _showVoiceAssistant,
                    ),
                  ],
                ),
              ),
              onTap: () {
                onChanged(controller.text);
              },
              onChanged: (val) {
                onChanged(val);
                setState(() {}); 
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInlineSearchField(IconData icon, String value, {required bool isDestination}) {
    return Row(
      children: [
        Icon(icon, color: isDestination ? const Color(0xFF6EC3A7) : Colors.white60, size: 18),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 15),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildBannerNotification() {
    return Container(
      height: 36,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFFCCE4FF),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(
        children: [
          Expanded(
            child: Text(
              'Tap on map to enter in full screen mode',
              style: TextStyle(color: Color(0xFF003D7E), fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ),
          Icon(Icons.close, color: Color(0xFF003D7E), size: 16),
        ],
      ),
    );
  }

  Widget _buildRouteInfoBubble(MapProvider mapProvider) {
    return Center(
      child: Container(
        margin: const EdgeInsets.only(bottom: 100), // Approximate mid-route
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF00BFFF),
          borderRadius: BorderRadius.circular(8),
          boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 10)],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.access_time, color: Colors.white, size: 14),
                const SizedBox(width: 4),
                Text(mapProvider.duration, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                const SizedBox(width: 10),
                const Icon(Icons.traffic, color: Colors.white, size: 14),
                const SizedBox(width: 4),
                Text('${mapProvider.signalCount}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ],
            ),
            Text('${mapProvider.tripCost} (Trip Cost)', style: const TextStyle(color: Colors.white, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _buildCircularSmallButton(IconData icon, VoidCallback onTap) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8, offset: const Offset(0, 2))
        ],
      ),
      child: IconButton(icon: Icon(icon, color: Colors.black, size: 20), onPressed: onTap, padding: EdgeInsets.zero),
    );
  }

  Widget _buildCircularTopButton(IconData icon, VoidCallback onTap) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 12, offset: const Offset(0, 4))
        ],
      ),
      child: IconButton(icon: Icon(icon, color: Colors.black, size: 22), onPressed: onTap),
    );
  }

  Widget _buildCircularActionButton(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.25), blurRadius: 18)],
        ),
        child: Icon(icon, color: Colors.black87, size: 26),
      ),
    );
  }

  Widget _buildRoutingControls(MapProvider mapProvider) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // 📊 Summary Card
        _buildSummaryCard(mapProvider),
        const SizedBox(height: 16),
        // 🔘 Action Row
        Row(
          children: [
            Expanded(
              flex: 2,
              child: _buildLargePillButton(
                icon: Icons.visibility,
                label: 'Preview',
                color: const Color(0xFF38A185), 
                onTap: () {},
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 3,
              child: _buildLargePillButton(
                icon: Icons.navigation_outlined,
                label: 'START',
                color: const Color(0xFF00563A), // Deep Forest
                onTap: () {
                  mapProvider.startNavigation();
                  Navigator.pushNamed(context, '/navigation');
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 2,
              child: _buildLargePillButton(
                icon: Icons.format_list_bulleted,
                label: 'List',
                color: const Color(0xFF1E1E1E),
                onTap: () => Navigator.pushNamed(context, '/directions'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSummaryCard(MapProvider mapProvider) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      decoration: BoxDecoration(
        color: const Color(0xFF161616),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black54, blurRadius: 20)],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Text(
                mapProvider.duration,
                style: const TextStyle(color: Color(0xFFE67E22), fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.assignment_outlined, color: Color(0xFFE67E22), size: 20),
              const Spacer(),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                '${mapProvider.distance} • ${mapProvider.arrivalTime}',
                style: const TextStyle(color: Colors.white, fontSize: 16),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(
                '${mapProvider.tripCost} ',
                style: const TextStyle(color: Colors.white, fontSize: 16),
              ),
              const Text(
                '(Petrol)',
                style: TextStyle(color: Color(0xFF38A185), fontSize: 16),
              ),
              const Spacer(),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.traffic_outlined, color: Color(0xFFFFCC00), size: 14),
                    const SizedBox(width: 6),
                    Text(
                      '${mapProvider.signalCount} Signals',
                      style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSmallGlassButton(IconData icon) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.95),
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 12)],
      ),
      child: Icon(icon, color: Colors.black87, size: 24),
    );
  }

  Widget _buildLargePillButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(30),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 12)],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                label,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showVoiceAssistant() {
    // Attach MapProvider to the assistant before opening
    final mapProvider = Provider.of<MapProvider>(context, listen: false);
    final assistant = Provider.of<AssistantService>(context, listen: false);
    assistant.attachMapProvider(mapProvider);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const VoiceListeningSheet(),
    );
  }
}

class VoiceListeningSheet extends StatefulWidget {
  const VoiceListeningSheet({super.key});

  @override
  State<VoiceListeningSheet> createState() => _VoiceListeningSheetState();
}

class _VoiceListeningSheetState extends State<VoiceListeningSheet>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();

    // Auto-start listening when sheet opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final assistant = Provider.of<AssistantService>(context, listen: false);
      assistant.startListening();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AssistantService>(
      builder: (context, assistant, _) {
        // Dynamic state colors
        Color pulseColor;
        IconData stateIcon;
        String stateLabel;
        String subtitle;

        switch (assistant.state) {
          case AssistantState.listening:
            pulseColor = const Color(0xFF38A185);
            stateIcon = Icons.mic;
            stateLabel = 'Listening...';
            subtitle = assistant.partialTranscript.isNotEmpty
                ? '"${assistant.partialTranscript}"'
                : 'How can I help you?';
            break;
          case AssistantState.thinking:
            pulseColor = const Color(0xFFE67E22);
            stateIcon = Icons.psychology;
            stateLabel = 'Thinking...';
            subtitle = '"${assistant.finalTranscript}"';
            break;
          case AssistantState.speaking:
            pulseColor = const Color(0xFF3498DB);
            stateIcon = Icons.volume_up;
            stateLabel = 'Ira';
            subtitle = assistant.assistantResponse;
            break;
          case AssistantState.idle:
          default:
            pulseColor = const Color(0xFF38A185);
            stateIcon = Icons.mic_none;
            stateLabel = assistant.assistantResponse.isNotEmpty ? 'Done!' : 'Tap to speak';
            subtitle = assistant.assistantResponse.isNotEmpty
                ? assistant.assistantResponse
                : 'How can I help you today?';
            break;
        }

        return Container(
          height: MediaQuery.of(context).size.height * 0.50,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(40)),
          ),
          child: SingleChildScrollView(
            child: Column(
              children: [
                const SizedBox(height: 12),

                // Drag handle
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.black12,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                const SizedBox(height: 20),

                // 🌊 Ripple Animation + State Icon
                GestureDetector(
                  onTap: () {
                    if (assistant.state == AssistantState.idle) {
                      assistant.startListening();
                    } else if (assistant.state == AssistantState.listening) {
                      assistant.stopListening();
                    }
                  },
                  child: SizedBox(
                    height: 180,
                    width: 180,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Animated Ripples
                        if (assistant.state == AssistantState.listening ||
                            assistant.state == AssistantState.speaking)
                          ...List.generate(3, (index) {
                            return AnimatedBuilder(
                              animation: _controller,
                              builder: (context, child) {
                                double progress =
                                    (_controller.value + (index * 0.33)) % 1.0;
                                double opacity =
                                    (1.0 - progress).clamp(0.0, 1.0);
                                opacity =
                                    Curves.easeOut.transform(opacity) * 0.25;

                                return Container(
                                  width: 80 + (progress * 100),
                                  height: 80 + (progress * 100),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: pulseColor.withOpacity(opacity),
                                  ),
                                );
                              },
                            );
                          }),

                        // 🎤 Central Button
                        Container(
                          width: 84,
                          height: 84,
                          decoration: BoxDecoration(
                            color: pulseColor,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: pulseColor.withOpacity(0.3),
                                blurRadius: 20,
                                spreadRadius: 5,
                              )
                            ],
                          ),
                          child: Icon(stateIcon, color: Colors.white, size: 36),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                Text(
                  stateLabel,
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(height: 8),

                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    subtitle,
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.black54,
                      fontSize: 14,
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                GestureDetector(
                  onTap: () {
                    assistant.stopListening();
                    Navigator.pop(context);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 40, vertical: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.black12),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Text(
                      'CANCEL',
                      style: TextStyle(
                        color: Colors.black54,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),
        );
      },
    );
  }
}