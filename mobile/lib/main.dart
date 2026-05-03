import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'theme/colors.dart';
import 'widgets/professional_loader.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  runApp(const TeleDriveApp());
}

class TeleDriveApp extends StatelessWidget {
  const TeleDriveApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TeleDrive',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: TDColors.background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: TDColors.primary,
          brightness: Brightness.dark,
          background: TDColors.background,
          surface: TDColors.surface,
        ),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  double _progress = 0;

  @override
  void initState() {
    super.initState();
    _simulateLoading();
  }

  void _simulateLoading() async {
    for (int i = 0; i <= 100; i++) {
      if (!mounted) return;
      setState(() {
        _progress = i.toDouble();
      });
      await Future.delayed(const Duration(milliseconds: 30));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 1.5,
            colors: [
              TDColors.primary.withOpacity(0.05),
              TDColors.background,
            ],
          ),
        ),
        child: Center(
          child: ProfessionalLoader(
            progress: _progress,
            label: 'Initializing Engine',
          ),
        ),
      ),
    );
  }
}
