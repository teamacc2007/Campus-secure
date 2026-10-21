import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../widgets/top_bar.dart';
import '../widgets/app_button.dart';

class VisitorPassActionScreen extends StatefulWidget {
  final Function(String screen) onNavigate;
  final Function(Map<String, dynamic> createdPass) onPassCreated;

  const VisitorPassActionScreen({
    Key? key,
    required this.onNavigate,
    required this.onPassCreated,
  }) : super(key: key);

  @override
  State<VisitorPassActionScreen> createState() => _VisitorPassActionScreenState();
}

class _VisitorPassActionScreenState extends State<VisitorPassActionScreen> {
  int activeTab = 0; // 0: Single Pass, 1: Bulk Pass

  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _purposeController = TextEditingController();
  final _eventNameController = TextEditingController();
  final _startDateController = TextEditingController(text: '21-10-2026');
  final _endDateController = TextEditingController(text: '21-10-2026');
  final _coordinatorController = TextEditingController(text: 'Prof. S. Venkatesh');
  final _coordPhoneController = TextEditingController(text: '9876543212');

  final List<String> availableBlocks = [
    'Admin Block',
    'Main Library',
    'Auditorium',
    'Medical College Block',
    'Hospital O.P.D',
    'Kaveri Hostel',
    'Ponni Hostel',
  ];
  final Set<String> selectedBlocks = {'Admin Block'};

  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _submitSinglePass() async {
    if (_nameController.text.trim().isEmpty || _phoneController.text.trim().isEmpty || _purposeController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Please fill all required visitor details.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService.createVisitorPass({
        'visitor_name': _nameController.text.trim(),
        'visitor_phone': _phoneController.text.trim(),
        'purpose': _purposeController.text.trim(),
        'event_name': _eventNameController.text.trim().isNotEmpty ? _eventNameController.text.trim() : null,
        'start_date': _startDateController.text.trim(),
        'end_date': _endDateController.text.trim(),
        'accessible_blocks': selectedBlocks.toList(),
        'coordinator_name': _coordinatorController.text.trim(),
        'coordinator_phone': _coordPhoneController.text.trim(),
        'is_bulk': false,
      });

      widget.onPassCreated(res);
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
        title: 'VISITOR PASS ISSUANCE',
        subtitle: 'Access Management System',
        action: IconButton(
          icon: const Icon(Icons.receipt_long_outlined, color: AppColors.blue),
          onPressed: () => widget.onNavigate('pass-records'),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Tabs: Single vs Bulk
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.line),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => activeTab = 0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: activeTab == 0 ? AppColors.blue : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Issue Single Pass',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: activeTab == 0 ? Colors.white : AppColors.text,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() => activeTab = 1);
                        widget.onNavigate('bulk-pass');
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: activeTab == 1 ? AppColors.blue : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Bulk Pass Wizard',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: activeTab == 1 ? Colors.white : AppColors.text,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Form container
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
                  const Text('1. Visitor Personal Information', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.navy)),
                  const SizedBox(height: 12),

                  const Text('Visitor Full Name *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B))),
                  const SizedBox(height: 5),
                  TextField(
                    controller: _nameController,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'e.g. R. Natarajan',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: AppColors.line)),
                    ),
                  ),
                  const SizedBox(height: 12),

                  const Text('Contact Phone Number *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B))),
                  const SizedBox(height: 5),
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'e.g. 9840123456',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: AppColors.line)),
                    ),
                  ),
                  const SizedBox(height: 12),

                  const Text('Purpose of Visit *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B))),
                  const SizedBox(height: 5),
                  TextField(
                    controller: _purposeController,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'e.g. Guest Lecture / Campus Visit',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: AppColors.line)),
                    ),
                  ),
                  const SizedBox(height: 18),

                  const Text('2. Access Scope & Accessible Blocks', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.navy)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: availableBlocks.map((b) {
                      final isSel = selectedBlocks.contains(b);
                      return FilterChip(
                        label: Text(b, style: TextStyle(fontSize: 10, fontWeight: isSel ? FontWeight.w700 : FontWeight.w500, color: isSel ? AppColors.blue : AppColors.text)),
                        selected: isSel,
                        selectedColor: AppColors.blueLight,
                        backgroundColor: Colors.white,
                        side: BorderSide(color: isSel ? AppColors.blue : AppColors.line),
                        onSelected: (val) {
                          setState(() {
                            if (val) selectedBlocks.add(b);
                            else selectedBlocks.remove(b);
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 18),

                  const Text('3. Host / Faculty Coordinator', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.navy)),
                  const SizedBox(height: 12),

                  const Text('Coordinator Name', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B))),
                  const SizedBox(height: 5),
                  TextField(
                    controller: _coordinatorController,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: AppColors.line)),
                    ),
                  ),
                  const SizedBox(height: 12),

                  const Text('Coordinator Phone Number', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B))),
                  const SizedBox(height: 5),
                  TextField(
                    controller: _coordPhoneController,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
              text: 'Issue Official Visitor Pass',
              onPressed: _submitSinglePass,
              isLoading: _isLoading,
              icon: const Icon(Icons.confirmation_number_outlined, size: 16, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
