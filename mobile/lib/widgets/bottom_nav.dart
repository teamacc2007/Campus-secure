import 'package:flutter/material.dart';
import '../config/theme.dart';

class BottomNavItem {
  final String id;
  final String label;
  final IconData icon;
  final int badgeCount;

  BottomNavItem({
    required this.id,
    required this.label,
    required this.icon,
    this.badgeCount = 0,
  });
}

class AppBottomNav extends StatelessWidget {
  final String role;
  final String activeScreen;
  final Function(String) onSelect;

  const AppBottomNav({
    Key? key,
    required this.role,
    required this.activeScreen,
    required this.onSelect,
  }) : super(key: key);

  List<BottomNavItem> _getMenuItems() {
    switch (role) {
      case 'security':
        return [
          BottomNavItem(id: 'home', label: 'Home', icon: Icons.shield_outlined),
          BottomNavItem(id: 'scan', label: 'Scan ID', icon: Icons.qr_code_scanner),
          BottomNavItem(id: 'logs', label: 'Entry Logs', icon: Icons.access_time),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
      case 'warden':
        return [
          BottomNavItem(id: 'home', label: 'Hostel', icon: Icons.domain),
          BottomNavItem(id: 'scan', label: 'Scan', icon: Icons.qr_code_scanner),
          BottomNavItem(id: 'logs', label: 'Students', icon: Icons.people_outline),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
      case 'staff':
        return [
          BottomNavItem(id: 'home', label: 'Faculty', icon: Icons.badge_outlined),
          BottomNavItem(id: 'scan', label: 'Verify', icon: Icons.qr_code_scanner),
          BottomNavItem(id: 'logs', label: 'Activity', icon: Icons.history),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
      case 'supervisor':
        return [
          BottomNavItem(id: 'home', label: 'Overview', icon: Icons.analytics_outlined),
          BottomNavItem(id: 'assignments', label: 'Guards', icon: Icons.people_outline),
          BottomNavItem(id: 'audit', label: 'Audit', icon: Icons.verified_user_outlined),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
      case 'access':
      case 'access-supervisor':
        return [
          BottomNavItem(id: 'visitor-pass', label: 'Passes', icon: Icons.confirmation_number_outlined),
          BottomNavItem(id: 'pass-records', label: 'Records', icon: Icons.receipt_long_outlined),
          BottomNavItem(id: 'access-notifications', label: 'Alerts', icon: Icons.notifications_none),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
      case 'students':
        return [
          BottomNavItem(id: 'home', label: 'Students', icon: Icons.people_outline),
          BottomNavItem(id: 'logs', label: 'Activity', icon: Icons.access_time),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
      case 'welfare':
        return [
          BottomNavItem(id: 'home', label: 'Welfare', icon: Icons.volunteer_activism_outlined),
          BottomNavItem(id: 'welfare-logs', label: 'Block Logs', icon: Icons.meeting_room_outlined),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
      case 'admin':
        return [
          BottomNavItem(id: 'home', label: 'Admin', icon: Icons.shield_outlined),
          BottomNavItem(id: 'users', label: 'Users', icon: Icons.manage_accounts_outlined),
          BottomNavItem(id: 'campus-entries', label: 'Entries', icon: Icons.meeting_room_outlined),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
      case 'cso':
        return [
          BottomNavItem(id: 'home', label: 'Oversight', icon: Icons.security_outlined),
          BottomNavItem(id: 'campus-entries', label: 'Entries', icon: Icons.meeting_room_outlined),
          BottomNavItem(id: 'login-logs', label: 'Worklog', icon: Icons.event_note_outlined),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
      case 'manager':
        return [
          BottomNavItem(id: 'home', label: 'Campus', icon: Icons.domain),
          BottomNavItem(id: 'institution-users', label: 'Directory', icon: Icons.people_outline),
          BottomNavItem(id: 'campus-entries', label: 'Entries', icon: Icons.meeting_room_outlined),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
      default:
        return [
          BottomNavItem(id: 'home', label: 'Home', icon: Icons.home_outlined),
          BottomNavItem(id: 'profile', label: 'Profile', icon: Icons.person_outline),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _getMenuItems();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.97),
        border: const Border(top: BorderSide(color: AppColors.line, width: 1)),
      ),
      child: SafeArea(
        top: false,
        child: Container(
          height: 64,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: items.map((item) {
              final isActive = activeScreen == item.id;
              final color = isActive ? AppColors.blue : const Color(0xFF8A97A8);

              return Expanded(
                child: InkWell(
                  onTap: () => onSelect(item.id),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(item.icon, size: 22, color: color),
                      const SizedBox(height: 4),
                      Text(
                        item.label,
                        style: TextStyle(
                          color: color,
                          fontSize: 10,
                          fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}
