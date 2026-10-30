import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../widgets/top_bar.dart';
import '../widgets/app_button.dart';
import '../widgets/status_badge.dart';

class IdentityResultScreen extends StatelessWidget {
  final Map<String, dynamic> person;
  final VoidCallback onConfirmEntry;
  final VoidCallback onCancel;

  const IdentityResultScreen({
    Key? key,
    required this.person,
    required this.onConfirmEntry,
    required this.onCancel,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final name = person['name'] ?? 'Kavitha R';
    final regNo = person['identifier'] ?? person['register_number'] ?? '22MBBS041';
    final dept = person['department'] ?? 'MBBS';
    final year = person['year_roman'] ?? person['year'] ?? 'II';
    final formattedYear = year.toString().toLowerCase().startsWith('year') ? year.toString() : 'Year $year';
    final batch = person['batch'] ?? '2023–2028';
    final residence = person['residence_type'] ?? 'Hostel';
    final hostel = person['hostel_name'] ?? 'Kaveri Hostel';
    final room = person['room_number'] ?? '304';
    final isStudent = person['person_type'] != 'staff';

    return Scaffold(
      appBar: TopBar(
        title: 'VERIFIED IDENTITY',
        subtitle: isStudent ? 'Student Record Matched' : 'Faculty Record Matched',
        onBack: onCancel,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.greenBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFBCEBD5)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: AppColors.green, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'AUTHORIZED CAMPUS ENTRY',
                          style: TextStyle(color: AppColors.green, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                        ),
                        Text(
                          'Biometric Match Confirmed • Active Enrolled Status',
                          style: TextStyle(color: Color(0xFF13593D), fontSize: 11, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Profile ID Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.line),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF192C46).withOpacity(0.06),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Avatar
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2D72E6), Color(0xFF153C72)],
                        begin: Alignment.topLeft,
                        end: Alignment.endBottomRight,
                      ),
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.blue.withOpacity(0.2),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        name.isNotEmpty ? name.split(' ').map((n) => n[0]).take(2).join() : 'KR',
                        style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  Text(
                    name,
                    style: const TextStyle(color: AppColors.text, fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  if (isStudent)
                    Text(
                      'Student · $formattedYear · Batch $batch',
                      style: const TextStyle(color: Color(0xFF45546B), fontSize: 12, fontWeight: FontWeight.w600),
                    )
                  else
                    const Text(
                      'Staff',
                      style: TextStyle(color: Color(0xFF45546B), fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.blueLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'SRM GROUP OF INSTITUTION TRICHY',
                      style: TextStyle(color: AppColors.blue, fontSize: 11, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Divider(color: AppColors.line),
                  const SizedBox(height: 12),

                  // Detail Rows
                  _buildDetailRow('Name', name),
                  const SizedBox(height: 8),
                  _buildDetailRow('Register Number', regNo),
                  const SizedBox(height: 8),
                  _buildDetailRow('Department', dept),
                  const SizedBox(height: 8),
                  _buildDetailRow('Academic Year', formattedYear),
                  const SizedBox(height: 8),
                  _buildDetailRow('Batch', batch),
                  const SizedBox(height: 8),
                  _buildDetailRow('Residence Category', residence),
                  if (residence == 'Hostel') ...[
                    const SizedBox(height: 8),
                    _buildDetailRow('Hostel & Room', '$hostel - Room $room'),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Confirm Button
            AppButton(
              text: 'Confirm & Log Entry',
              onPressed: onConfirmEntry,
              icon: const Icon(Icons.check, size: 18, color: Colors.white),
            ),
            const SizedBox(height: 10),
            AppButton(
              text: 'Cancel',
              variant: ButtonVariant.secondary,
              onPressed: onCancel,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        Text(value, style: const TextStyle(color: AppColors.text, fontSize: 12, fontWeight: FontWeight.w700)),
      ],
    );
  }
}
