import 'package:flutter/material.dart';

class TDColors {
  static const Color background = Color(0xFF020617);
  static const Color surface = Color(0xFF0F172A);
  static const Color primary = Color(0xFF3B82F6);
  static const Color secondary = Color(0xFF60A5FA);
  static const Color accent = Color(0xFF00D2FF);
  static const Color textPrimary = Colors.white;
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color error = Color(0xFFEF4444);
  
  static const LinearGradient turboGradient = LinearGradient(
    colors: [Color(0xFF1D4ED8), Color(0xFF3B82F6), Color(0xFF60A5FA)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );
}
