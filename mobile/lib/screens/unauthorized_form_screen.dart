import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../widgets/top_bar.dart';
import '../widgets/app_button.dart';

class UnauthorizedFormScreen extends StatefulWidget {
  final VoidCallback onBack;
  final VoidCallback onSuccess;

  const UnauthorizedFormScreen({
    Key? key,
    required this.onBack,
    required this.onSuccess,
  }) : super(key: key);

  @override
  State<UnauthorizedFormScreen> createState() => _UnauthorizedFormScreenState();
}

class _UnauthorizedFormScreenState extends State<UnauthorizedFormScreen> {
  final _nameController = TextEditingController(text: 'Unknown Individual');
  final _phoneController = TextEditingController();
  final _reasonController = TextEditingController(text: 'Face scan unverified, unable to produce college ID card');
  String selectedGate = 'Gate 1 Main Entrance';
  bool _isLoading = false;
  String? _errorMessage;

  final List<String> gates = [
    'Gate 1 Main Entrance',
    'Gate 2 Hospital Entrance',
    'Hostel Gate North',
    'Library & Admin Gate',
  ];

  bool _validatePhoneNumber(String phone) {
    if (phone.isEmpty) return false;
    final cleaned = phone.replaceAll(RegExp(r'[\s\-()]'), '');
    final indianRegex = RegExp(r'^(\+91|91|0)?[6-9]\d{9}$');
    final intlRegex = RegExp(r'^\+[1-9]\d{6,14}$');
    final genericRegex = RegExp(r'^\d{10,15}$');
    return indianRegex.hasMatch(cleaned) || intlRegex.hasMatch(cleaned) || genericRegex.hasMatch(cleaned);
  }

  Future<void> _submitUnauthorizedLog() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      setState(() {
        _errorMessage = 'Phone Number is mandatory. Please enter a valid phone number.';
      });
      return;
    }

    if (!_validatePhoneNumber(phone)) {
      setState(() {
        _errorMessage = 'Please enter a valid phone number (e.g. +91 9876543210 or 9876543210).';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ApiService.logAccessEvent({
        'person_type': 'Unauthorized',
        'name': _nameController.text.trim(),
        'identifier_value': phone,
        'phone_number': phone,
        'location_block': selectedGate,
        'event_type': 'ENTRY',
        'verification_method': 'Manual Security Flag',
        'verification_status': 'Unauthorized',
        'review_status': 'Pending Verification',
        'flag_reason': _reasonController.text.trim().isNotEmpty
            ? 'Phone: $phone. ${_reasonController.text.trim()}'
            : 'Phone: $phone. Unauthorized person detected at security gate',
      });
      widget.onSuccess();
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(
        title: 'LOG UNAUTHORIZED ATTEMPT',
        subtitle: 'Security Alert Dispatch',
        onBack: widget.onBack,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFEAEC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFF0C7CA)),
              ),
              child: const Text(
                'Logging this event creates an immediate audit record and flags an alert in the Campus Supervisor dashboard.',
                style: TextStyle(color: AppColors.redText, fontSize: 11, height: 1.4),
              ),
            ),
            const SizedBox(height: 18),

            // Form
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.line),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Full Name', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B))),
                  const SizedBox(height: 5),
                  TextField(
                    controller: _nameController,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Enter name if available',
                      hintStyle: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: AppColors.line)),
                    ),
                  ),
                  const SizedBox(height: 12),

                  const Text('Phone Number', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B))),
                  const SizedBox(height: 5),
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Enter phone number',
                      hintStyle: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: AppColors.line)),
                    ),
                  ),
                  const SizedBox(height: 12),

                  const Text('Gate / Access Point', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B))),
                  const SizedBox(height: 5),
                  DropdownButtonFormField<String>(
                    value: selectedGate,
                    style: const TextStyle(fontSize: 12, color: AppColors.text),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: AppColors.line)),
                    ),
                    items: gates.map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                    onChanged: (val) => setState(() => selectedGate = val ?? selectedGate),
                  ),
                  const SizedBox(height: 12),

                  const Text('Security Notes', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B))),
                  const SizedBox(height: 5),
                  TextField(
                    controller: _reasonController,
                    maxLines: 3,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Optional operational notes',
                      hintStyle: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      contentPadding: const EdgeInsets.all(12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: AppColors.line)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            if (_errorMessage != null) ...[
              Text(_errorMessage!, style: const TextStyle(color: AppColors.redText, fontSize: 11)),
              const SizedBox(height: 10),
            ],

            AppButton(
              text: 'Record & notify Campus Supervisor',
              variant: ButtonVariant.danger,
              onPressed: _submitUnauthorizedLog,
              isLoading: _isLoading,
              icon: const Icon(Icons.shield_alert, size: 16, color: AppColors.redText),
            ),
            const SizedBox(height: 8),
            AppButton(
              text: 'Cancel',
              variant: ButtonVariant.secondary,
              onPressed: widget.onBack,
            ),
          ],
        ),
      ),
    );
  }
}
