import 'package:flutter/material.dart';

class AppColors {
  static const Color navy = Color(0xFF153C72);
  static const Color navyDark = Color(0xFF0D2F60);
  static const Color blue = Color(0xFF2563EB);
  static const Color blueLight = Color(0xFFEAF2FF);
  static const Color blueDark = Color(0xFF174CA9);
  
  static const Color surface = Color(0xFFF7F9FC);
  static const Color background = Color(0xFFE8EDF4);
  static const Color card = Colors.white;
  static const Color line = Color(0xFFE2E8F0);
  
  static const Color text = Color(0xFF17243A);
  static const Color textMuted = Color(0xFF6C7B91);
  static const Color textDark = Color(0xFF1C2C44);
  
  // Status Colors
  static const Color green = Color(0xFF08744E);
  static const Color greenBg = Color(0xFFE5F7EF);
  static const Color greenText = Color(0xFF11865B);
  
  static const Color amber = Color(0xFF946008);
  static const Color amberBg = Color(0xFFFFF2D5);
  static const Color amberText = Color(0xFFA76508);
  
  static const Color red = Color(0xFFB32E38);
  static const Color redBg = Color(0xFFFFE9EB);
  static const Color redText = Color(0xFFB52A35);
  
  static const Color blueBadge = Color(0xFF1B5CC6);
  static const Color blueBadgeBg = Color(0xFFE7F0FF);
  
  static const Color gray = Color(0xFF5F6D80);
  static const Color grayBg = Color(0xFFEDF1F5);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: AppColors.surface,
      primaryColor: AppColors.blue,
      fontFamily: 'Inter',
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.blue,
        primary: AppColors.blue,
        surface: AppColors.surface,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: AppColors.text),
        titleTextStyle: TextStyle(
          color: AppColors.text,
          fontSize: 16,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
