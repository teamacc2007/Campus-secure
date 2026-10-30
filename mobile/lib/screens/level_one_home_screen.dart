import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../widgets/top_bar.dart';
import '../widgets/status_badge.dart';

class LevelOneHomeScreen extends StatelessWidget {
  final String role;
  final String fullName;
  final Function(String screen) onNavigate;

  const LevelOneHomeScreen({
    Key? key,
    required this.role,
    required this.fullName,
    required this.onNavigate,
  }) : super(key: key);

  String _getRoleTitle() {
    if (role == 'warden') return 'Hostel Warden Portal';
    if (role == 'staff') return 'Faculty & Staff Portal';
    return 'Security Guard Portal';
  }

  String _getHeroSubtitle() {
    if (role == 'warden') return 'Hostel Blocks & Resident Verification';
    if (role == 'staff') return 'Departmental Student Identification';
    return 'Gate 1 Main Entrance • Active Shift';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(
        title: 'SRM GROUP OF INSTITUTION TRICHY',
        subtitle: _getRoleTitle(),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // User Header
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2D72E6), Color(0xFF153C72)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Text(
                      fullName.isNotEmpty ? fullName[0] : 'S',
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fullName,
                        style: const TextStyle(color: AppColors.text, fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const StatusBadge(tone: StatusTone.green, label: 'ON DUTY'),
                          const SizedBox(width: 8),
                          Text(
                            role == 'security' ? 'SG-101 • Gate 1' : 'Verified Staff',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Hero Card
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
                  const Text(
                    'ACCESS POINT MONITORING',
                    style: TextStyle(color: Color(0xFFBDD4F4), fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 1),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _getHeroSubtitle(),
                    style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'AI Face Recognition Active',
                        style: TextStyle(color: Color(0xFFC9DAF3), fontSize: 11),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Live Online', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Action Buttons
            const Text(
              'Quick Verification Actions',
              style: TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),

            // Primary Scan Button
            InkWell(
              onTap: () => onNavigate('scan'),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2A6EE6), Color(0xFF174CA9)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.blue.withOpacity(0.25),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Scan Face or Register ID',
                            style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Verify student, faculty, or visitor entry',
                            style: TextStyle(color: Color(0xFFCADCF8), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: Colors.white),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Secondary: View Logs
            InkWell(
              onTap: () => onNavigate('logs'),
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
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.blueLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.access_time, color: AppColors.blue, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('View Entry & Exit Logs', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.text)),
                          Text('Check today’s campus activity history', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.textMuted),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Secondary: Log Unauthorized
            InkWell(
              onTap: () => onNavigate('unauthorised'),
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
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFEAEC),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.warning_amber_rounded, color: AppColors.red, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('Log Unauthorized Entry', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.text)),
                          Text('Report unverified attempt to campus supervisor', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.textMuted),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Mini Stats
            Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.line),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      children: const [
                        Text('148', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text)),
                        SizedBox(height: 2),
                        Text('Today Entries', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 28, color: AppColors.line),
                  Expanded(
                    child: Column(
                      children: const [
                        Text('12', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.blue)),
                        SizedBox(height: 2),
                        Text('Active Passes', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 28, color: AppColors.line),
                  Expanded(
                    child: Column(
                      children: const [
                        Text('1', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.redText)),
                        SizedBox(height: 2),
                        Text('Alerts Flagged', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
