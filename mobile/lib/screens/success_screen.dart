import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../widgets/top_bar.dart';
import '../widgets/app_button.dart';

class SuccessScreen extends StatelessWidget {
  final VoidCallback onReturnHome;
  final VoidCallback onScanNext;

  const SuccessScreen({
    Key? key,
    required this.onReturnHome,
    required this.onScanNext,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const TopBar(
        title: 'CAMPUS ACCESS',
        subtitle: 'Entry Logged',
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.greenBg,
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFBCEBD5), width: 2),
              ),
              child: const Icon(Icons.check, size: 44, color: AppColors.green),
            ),
            const SizedBox(height: 20),
            const Text(
              'Entry Recorded Successfully',
              style: TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            const Text(
              'Access granted and logged into institution real-time records.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 36),

            AppButton(
              text: 'Scan Next Person',
              onPressed: onScanNext,
              icon: const Icon(Icons.qr_code_scanner, size: 16, color: Colors.white),
            ),
            const SizedBox(height: 12),
            AppButton(
              text: 'Return to Home',
              variant: ButtonVariant.secondary,
              onPressed: onReturnHome,
            ),
          ],
        ),
      ),
    );
  }
}
