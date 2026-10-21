import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../widgets/top_bar.dart';
import '../widgets/status_badge.dart';

class SupervisorHomeScreen extends StatelessWidget {
  final String fullName;
  final Function(String screen) onNavigate;

  const SupervisorHomeScreen({
    Key? key,
    required this.fullName,
    required this.onNavigate,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const TopBar(
        title: 'CAMPUS SUPERVISOR',
        subtitle: 'Security Oversight & Guard Management',
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.navy, Color(0xFF1F5DB3)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF153C72).withOpacity(0.18),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('SECURITY OPERATIONS CENTER', style: TextStyle(color: Color(0xFFBDD4F4), fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 1)),
                  const SizedBox(height: 6),
                  Text('Supervisor $fullName', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  const Text('Zone A - North Campus & Main Gates', style: TextStyle(color: Color(0xFFC9DAF3), fontSize: 11)),
                  const SizedBox(height: 14),
                  Row(
                    children: const [
                      StatusBadge(tone: StatusTone.green, label: '4 GUARDS ON DUTY'),
                      SizedBox(width: 8),
                      StatusBadge(tone: StatusTone.amber, label: '1 PENDING ALERT'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            const Text('Supervisory Management', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.text)),
            const SizedBox(height: 10),

            _actionCard(
              title: 'Review Incident Alerts',
              desc: 'Investigate and verify flagged unauthorized entries',
              icon: Icons.shield_outlined,
              iconColor: AppColors.amber,
              iconBg: AppColors.amberBg,
              onTap: () => onNavigate('alerts'),
            ),
            const SizedBox(height: 10),

            _actionCard(
              title: 'Guard Workload & Shift Assignments',
              desc: 'Monitor active guard posts, gate duties, and shift hours',
              icon: Icons.people_outline,
              iconColor: AppColors.blue,
              iconBg: AppColors.blueLight,
              onTap: () => onNavigate('assignments'),
            ),
            const SizedBox(height: 10),

            _actionCard(
              title: 'Enroll New Security Guard',
              desc: 'Register guard profile, phone number, and assign gate',
              icon: Icons.person_add_outlined,
              iconColor: AppColors.green,
              iconBg: AppColors.greenBg,
              onTap: () => onNavigate('create-guard'),
            ),
            const SizedBox(height: 10),

            _actionCard(
              title: 'Security Audit Records',
              desc: 'View comprehensive verification and revocation trail',
              icon: Icons.verified_user_outlined,
              iconColor: AppColors.navy,
              iconBg: const Color(0xFFEDF1F5),
              onTap: () => onNavigate('audit'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _actionCard({
    required String title,
    required String desc,
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.text)),
                  const SizedBox(height: 2),
                  Text(desc, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
