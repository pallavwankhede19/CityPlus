import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class MarkerGenerator {
  /// Matches the 'Pill Capsule' traffic signal from the user's screenshots.
  static Future<BitmapDescriptor> createSignalIcon({
    required int phase, // 0: Red, 1: Yellow, 2: Green
    double size = 180,
  }) async {
    final ui.PictureRecorder pictureRecorder = ui.PictureRecorder();
    final Canvas canvas = Canvas(pictureRecorder);
    
    // 🎨 1. Draw Deep Black Horizontal Slim Capsule
    final Paint capsulePaint = Paint()
      ..color = const Color(0xFF1E1E1E).withOpacity(0.98)
      ..style = PaintingStyle.fill;
    
    // Slimmer pill shape (Width >> Height)
    final double width = size * 0.85;
    final double height = size * 0.32;
    final RRect capsuleRRect = RRect.fromLTRBR(
      (size - width) / 2,
      (size - height) / 2,
      (size + width) / 2,
      (size + height) / 2,
      Radius.circular(height / 2),
    );
    canvas.drawRRect(capsuleRRect, capsulePaint);
    
    // 🎨 2. Draw Sharp Border
    final Paint borderPaint = Paint()
      ..color = Colors.white.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawRRect(capsuleRRect, borderPaint);

    // Tight spacing logic
    final double startX = (size - width) / 2 + (width * 0.18);
    final double endX = (size + width) / 2 - (width * 0.18);
    final double spacingX = (endX - startX) / 2;
    final double circleRadius = height * 0.32;
    
    final List<Color> colors = [
      const Color(0xFFFF3B30), // Intense Red
      const Color(0xFFFFCC00), // Intense Yellow
      const Color(0xFF34C759), // Intense Green
    ];

    for (int i = 0; i < 3; i++) {
      final Offset center = Offset(startX + (spacingX * i), size / 2);
      final bool isActive = i == phase;
      final Color color = isActive ? colors[i] : colors[i].withOpacity(0.1);

      // --- NEON OVERGlow ---
      if (isActive) {
        final Paint glowPaint = Paint()
          ..color = color.withOpacity(0.45)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
        canvas.drawCircle(center, circleRadius + 5, glowPaint);
        
        final Paint coreGlow = Paint()
          ..color = color.withOpacity(0.8)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
        canvas.drawCircle(center, circleRadius, coreGlow);
      }

      // --- MAIN LIGHT ---
      final Paint circlePaint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center, circleRadius, circlePaint);
      
      // --- PREMIUM SHINE ---
      if (isActive) {
        final Paint shinePaint = Paint()
          ..color = Colors.white.withOpacity(0.5)
          ..style = PaintingStyle.fill;
        canvas.drawCircle(center.translate(-2, -2), circleRadius * 0.35, shinePaint);
      }
    }

    final ui.Image image = await pictureRecorder.endRecording().toImage(size.toInt(), size.toInt());
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.fromBytes(byteData!.buffer.asUint8List());
  }
}
