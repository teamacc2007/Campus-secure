import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../widgets/top_bar.dart';
import '../widgets/app_button.dart';
import '../widgets/status_badge.dart';

class ProfileScreen extends StatelessWidget {
  final String role;
  final String username;
  final String fullName;
  final VoidCallback onBack;
  final VoidCallback onLogout;

  const ProfileScreen({
    Key? key,
    required this.role,
    required this.username,
    required this.fullName,
    required this.onBack,
    required this.onLogout,
  }) : super(key: key);

  String _formatRole(String r) {
    if (r == 'security') return 'Campus Security Personnel';
    if (r == 'supervisor') return 'Campus Security Supervisor';
    if (r == 'access' || r == 'access-supervisor') return 'Access & Visitor Supervisor';
    if (r == 'warden') return 'Hostel Warden';
    if (r == 'staff') return 'Faculty Member';
    if (r == 'students') return 'Student Affairs Officer';
    if (r == 'welfare') return 'Student Welfare Officer';
    if (r == 'admin') return 'System Administrator';
    if (r == 'cso') return 'Chief Security Officer';
    if (r == 'manager') return 'Institute General Manager';
    return r.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(
        title: 'USER PROFILE',
        subtitle: 'Security Credentials & Access Scope',
        onBack: onBack,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
        child: Column(
          children: [
            // Avatar & Name Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.line),
              ),
              child: Column(
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2D72E6), Color(0xFF153C72)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: Center(
                      child: Text(
                        fullName.isNotEmpty ? fullName[0] : 'U',
                        style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    fullName,
                    style: const TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatRole(role),
                    style: const TextStyle(color: AppColors.blue, fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  const StatusBadge(tone: StatusTone.green, label: 'ACTIVE SESSION'),
                  const SizedBox(height: 16),
                  const Divider(color: AppColors.line),
                  const SizedBox(height: 12),

                  _infoRow('Username', username),
                  const SizedBox(height: 8),
                  _infoRow('Institution', 'Trichy SRM Medical College'),
                  const SizedBox(height: 8),
                  _infoRow('Campus Code', 'SRM-TRICHY-01'),
                  const SizedBox(height: 8),
                  _infoRow('Access Zone', 'Main Campus & Hospital Gates'),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Logout Button
            AppButton(
              text: 'Sign Out of Portal',
              variant: ButtonVariant.danger,
              onPressed: onLogout,
              icon: const Icon(Icons.logout, size: 16, color: AppColors.redText),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        Text(value, style: const TextStyle(color: AppColors.text, fontSize: 11, fontWeight: FontWeight.w700)),
      ],
    );
  }
}
