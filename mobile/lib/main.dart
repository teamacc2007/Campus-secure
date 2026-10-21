import 'package:flutter/material.dart';
import 'config/theme.dart';
import 'screens/login_screen.dart';
import 'screens/level_one_home_screen.dart';
import 'screens/scan_screen.dart';
import 'screens/identity_result_screen.dart';
import 'screens/unrecognized_result_screen.dart';
import 'screens/unauthorized_form_screen.dart';
import 'screens/success_screen.dart';
import 'screens/logs_screen.dart';
import 'screens/visitor_pass_action_screen.dart';
import 'screens/visitor_pass_records_screen.dart';
import 'screens/visitor_pass_detail_screen.dart';
import 'screens/bulk_visitor_pass_screen.dart';
import 'screens/supervisor_home_screen.dart';
import 'screens/alerts_screen.dart';
import 'screens/profile_screen.dart';
import 'widgets/bottom_nav.dart';

void main() {
  runApp(const CampusSecureApp());
}

class CampusSecureApp extends StatelessWidget {
  const CampusSecureApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Campus Secure - SRM Trichy',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const MainNavigator(),
    );
  }
}

class MainNavigator extends StatefulWidget {
  const MainNavigator({Key? key}) : super(key: key);

  @override
  State<MainNavigator> createState() => _MainNavigatorState();
}

class _MainNavigatorState extends State<MainNavigator> {
  String currentRole = 'security';
  String currentUsername = 'security';
  String currentFullName = 'G. Selvam';
  String activeScreen = 'login';
  
  // State variables for navigation flow
  Map<String, dynamic>? currentPerson;
  Map<String, dynamic>? selectedPass;

  void _onLoginSuccess(String role, String username, String fullName) {
    setState(() {
      currentRole = role;
      currentUsername = username;
      currentFullName = fullName;
      if (role == 'access' || role == 'access-supervisor') {
        activeScreen = 'visitor-pass';
      } else {
        activeScreen = 'home';
      }
    });
  }

  void _onLogout() {
    setState(() {
      activeScreen = 'login';
      currentPerson = null;
      selectedPass = null;
    });
  }

  Widget _buildScreenContent() {
    switch (activeScreen) {
      case 'login':
        return LoginScreen(
          onLoginSuccess: _onLoginSuccess,
          onForgotPassword: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Please contact System Administrator at admin@srmtrichy.edu.in to reset credentials.')),
            );
          },
        );

      case 'home':
        if (currentRole == 'supervisor') {
          return SupervisorHomeScreen(
            fullName: currentFullName,
            onNavigate: (s) => setState(() => activeScreen = s),
          );
        }
        return LevelOneHomeScreen(
          role: currentRole,
          fullName: currentFullName,
          onNavigate: (s) => setState(() => activeScreen = s),
        );

      case 'scan':
        return ScanScreen(
          role: currentRole,
          onBack: () => setState(() => activeScreen = 'home'),
          onIdentified: (person) {
            setState(() {
              currentPerson = person;
              activeScreen = 'identity';
            });
          },
          onUnrecognized: () => setState(() => activeScreen = 'unrecognized'),
        );

      case 'identity':
        return IdentityResultScreen(
          person: currentPerson ?? {
            'name': 'Kavitha R',
            'register_number': '22MBBS041',
            'department': 'MBBS',
            'year_roman': 'III Year',
            'batch': '2022 - 2027',
            'residence_type': 'Hostel',
            'hostel_name': 'Kaveri Hostel',
            'room_number': '304',
          },
          onConfirmEntry: () => setState(() => activeScreen = 'success'),
          onCancel: () => setState(() => activeScreen = 'home'),
        );

      case 'unrecognized':
        return UnrecognizedResultScreen(
          onRetryScan: () => setState(() => activeScreen = 'scan'),
          onLogUnauthorized: () => setState(() => activeScreen = 'unauthorised'),
          onEnterRegisterId: () => setState(() => activeScreen = 'scan'),
        );

      case 'unauthorised':
        return UnauthorizedFormScreen(
          onBack: () => setState(() => activeScreen = 'home'),
          onSuccess: () => setState(() => activeScreen = 'success'),
        );

      case 'success':
        return SuccessScreen(
          onReturnHome: () => setState(() => activeScreen = 'home'),
          onScanNext: () => setState(() => activeScreen = 'scan'),
        );

      case 'logs':
      case 'campus-entries':
      case 'welfare-logs':
        return LogsScreen(
          role: currentRole,
          onBack: () => setState(() => activeScreen = 'home'),
        );

      case 'visitor-pass':
        return VisitorPassActionScreen(
          onNavigate: (s) => setState(() => activeScreen = s),
          onPassCreated: (pass) {
            setState(() {
              selectedPass = pass;
              activeScreen = 'pass-detail';
            });
          },
        );

      case 'pass-records':
        return VisitorPassRecordsScreen(
          onBack: () => setState(() => activeScreen = 'visitor-pass'),
          onOpenPass: (pass) {
            setState(() {
              selectedPass = pass;
              activeScreen = 'pass-detail';
            });
          },
        );

      case 'pass-detail':
        return VisitorPassDetailScreen(
          pass: selectedPass ?? {
            'pass_number': 'VP-2026-0001',
            'visitor_name': 'R. Natarajan',
            'visitor_phone': '9840123456',
            'purpose': 'Guest Lecture on Clinical Ethics',
            'status': 'Active',
            'start_date': '21-10-2026',
            'end_date': '22-10-2026',
            'accessible_blocks': ['Auditorium', 'Dean Office'],
            'coordinator_name': 'Dr. S. Venkatesh',
            'coordinator_phone': '9876543212',
          },
          onBack: () => setState(() => activeScreen = 'pass-records'),
          onPassCancelled: () => setState(() => activeScreen = 'pass-records'),
        );

      case 'bulk-pass':
        return BulkVisitorPassScreen(
          onBack: () => setState(() => activeScreen = 'visitor-pass'),
          onFinished: () => setState(() => activeScreen = 'pass-records'),
        );

      case 'alerts':
        return AlertsScreen(
          onBack: () => setState(() => activeScreen = 'home'),
        );

      case 'assignments':
      case 'create-guard':
      case 'audit':
      case 'users':
      case 'institution-users':
      case 'login-logs':
        return LogsScreen(
          role: currentRole,
          onBack: () => setState(() => activeScreen = 'home'),
        );

      case 'profile':
        return ProfileScreen(
          role: currentRole,
          username: currentUsername,
          fullName: currentFullName,
          onBack: () => setState(() => activeScreen = 'home'),
          onLogout: _onLogout,
        );

      default:
        return LevelOneHomeScreen(
          role: currentRole,
          fullName: currentFullName,
          onNavigate: (s) => setState(() => activeScreen = s),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final showNav = activeScreen != 'login';

    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 430),
          child: _buildScreenContent(),
        ),
      ),
      bottomNavigationBar: showNav
          ? AppBottomNav(
              role: currentRole,
              activeScreen: activeScreen,
              onSelect: (screen) {
                setState(() {
                  activeScreen = screen;
                });
              },
            )
          : null,
    );
  }
}
