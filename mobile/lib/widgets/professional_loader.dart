import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../theme/colors.dart';

class ProfessionalLoader extends StatefulWidget {
  final double? progress;
  final String label;

  const ProfessionalLoader({
    super.key,
    this.progress,
    this.label = 'Turbo Protocol',
  });

  @override
  State<ProfessionalLoader> createState() => _ProfessionalLoaderState();
}

class _ProfessionalLoaderState extends StatefulWidget with TickerProviderStateMixin {
  late AnimationController _outerController;
  late AnimationController _innerController;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _outerController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();

    _innerController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat(reverse: true);

    _pulseController = AnimationController(
      duration: const Duration(seconds: 1),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _outerController.dispose();
    _innerController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            // Outer Ring
            RotationTransition(
              turns: _outerController,
              child: CustomPaint(
                size: const Size(120, 120),
                painter: OrbitalPainter(
                  color: TDColors.primary,
                  thickness: 3.0,
                  isOuter: true,
                ),
              ),
            ),
            // Inner Ring (Reversed)
            RotationTransition(
              turns: Tween(begin: 1.0, end: 0.0).animate(_innerController),
              child: CustomPaint(
                size: const Size(90, 90),
                painter: OrbitalPainter(
                  color: TDColors.secondary.withOpacity(0.5),
                  thickness: 2.0,
                  isOuter: false,
                ),
              ),
            ),
            // Glowing Logo Center
            ScaleTransition(
              scale: Tween(begin: 0.95, end: 1.05).animate(
                CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
              ),
              child: Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: TDColors.primary.withOpacity(0.3),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: ClipOval(
                  child: Image.asset(
                    'assets/logo.png',
                    errorBuilder: (context, error, stackTrace) => 
                        const Icon(Icons.cloud_queue, color: Colors.white, size: 30),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 40),
        // Branding
        Text(
          'TELEDRIVE',
          style: TextStyle(
            color: TDColors.textPrimary,
            fontSize: 24,
            fontWeight: FontWeight.w900,
            letterSpacing: 8.0,
          ),
        ),
        const SizedBox(height: 16),
        // Progress Bar
        if (widget.progress != null) ...[
          Container(
            width: 200,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white10,
              borderRadius: BorderRadius.circular(10),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: widget.progress! / 100,
              child: Container(
                decoration: BoxDecoration(
                  gradient: TDColors.turboGradient,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: TDColors.primary.withOpacity(0.5),
                      blurRadius: 10,
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${widget.label}: ${widget.progress!.toInt()}%',
            style: TextStyle(
              color: TDColors.secondary,
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 2.0,
            ),
          ),
        ] else ...[
          Text(
            'SYNCHRONIZING DATA...',
            style: TextStyle(
              color: TDColors.secondary,
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 2.0,
            ),
          ),
        ],
      ],
    );
  }
}

class OrbitalPainter extends CustomPainter {
  final Color color;
  final double thickness;
  final bool isOuter;

  OrbitalPainter({
    required this.color,
    required this.thickness,
    required this.isOuter,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = thickness
      ..strokeCap = StrokeCap.round;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    if (isOuter) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        0,
        math.pi * 0.8,
        false,
        paint,
      );
    } else {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        math.pi,
        math.pi * 0.6,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
