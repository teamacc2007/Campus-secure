import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../widgets/top_bar.dart';
import '../widgets/app_button.dart';

class UnrecognizedResultScreen extends StatelessWidget {
  final VoidCallback onRetryScan;
  final VoidCallback onLogUnauthorized;
  final VoidCallback onEnterRegisterId;

  const UnrecognizedResultScreen({
    Key? key,
    required this.onRetryScan,
    required this.onLogUnauthorized,
    required this.onEnterRegisterId,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(
        title: 'VERIFICATION RESULT',
        subtitle: 'Unrecognized Face',
        onBack: onRetryScan,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Warning Banner
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.redBg,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFF0C7CA)),
              ),
              child: Column(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFD5D8),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.warning_amber_rounded, color: AppColors.red, size: 28),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Identity Not Recognized',
                    style: TextStyle(color: AppColors.redText, fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'The scanned face does not match any enrolled student or faculty record in the institution database.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF8B232C), fontSize: 11, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              'Recommended Security Procedures',
              style: TextStyle(color: AppColors.text, fontSize: 13, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),

            // Option 1: Manual Register ID Lookup
            InkWell(
              onTap: onEnterRegisterId,
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
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
                      child: const Icon(Icons.badge_outlined, color: AppColors.blue, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('Verify by Register Number', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.text)),
                          Text('Ask for student physical ID card and verify number', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.textMuted),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Option 2: Log Unauthorized Attempt
            InkWell(
              onTap: onLogUnauthorized,
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFF0C7CA)),
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
                      child: const Icon(Icons.security, color: AppColors.red, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('Log Unauthorized Entry', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.redText)),
                          Text('Notify campus supervisor of security alert', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.red),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            AppButton(
              text: 'Try Face Scan Again',
              variant: ButtonVariant.secondary,
              onPressed: onRetryScan,
              icon: const Icon(Icons.refresh, size: 16),
            ),
          ],
        ),
      ),
    );
  }
}
