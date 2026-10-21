import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../widgets/top_bar.dart';
import '../widgets/app_button.dart';
import '../widgets/status_badge.dart';

class BulkVisitorPassScreen extends StatefulWidget {
  final VoidCallback onBack;
  final VoidCallback onFinished;

  const BulkVisitorPassScreen({
    Key? key,
    required this.onBack,
    required this.onFinished,
  }) : super(key: key);

  @override
  State<BulkVisitorPassScreen> createState() => _BulkVisitorPassScreenState();
}

class _BulkVisitorPassScreenState extends State<BulkVisitorPassScreen> {
  int stage = 0; // 0: Event Details, 1: Import Excel, 2: Review & Confirm, 3: Success

  // Event details form
  final _eventNameController = TextEditingController(text: 'Inter-College Medical Symposium 2026');
  final _eventPurposeController = TextEditingController(text: 'Delegate Attendance & Case Presentations');
  final _fromDateController = TextEditingController(text: '21-10-2026');
  final _toDateController = TextEditingController(text: '23-10-2026');
  final _coordNameController = TextEditingController(text: 'Dr. S. Venkatesh');
  final _coordPhoneController = TextEditingController(text: '9876543212');

  // Excel parsed preview
  String? selectedFileName;
  Uint8List? selectedFileBytes;
  Map<String, dynamic>? previewResult;
  bool _isLoading = false;
  String? _errorMessage;
  int issuedCount = 0;

  Future<void> _pickExcelFile() async {
    setState(() => _errorMessage = null);
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['xlsx', 'xls'],
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        if (file.bytes != null) {
          setState(() {
            selectedFileName = file.name;
            selectedFileBytes = file.bytes;
            _isLoading = true;
          });

          final preview = await ApiService.previewBulkExcel(file.bytes!, file.name);
          setState(() {
            previewResult = preview;
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _confirmBulkIssuance() async {
    if (previewResult == null) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final reqBody = {
        'event_details': {
          'event_name': _eventNameController.text.trim(),
          'event_purpose': _eventPurposeController.text.trim(),
          'from_date': _fromDateController.text.trim(),
          'to_date': _toDateController.text.trim(),
          'accessible_blocks': ['Auditorium', 'Medical College Block'],
          'coordinator_name': _coordNameController.text.trim(),
          'coordinator_phone': _coordPhoneController.text.trim(),
        },
        'records': previewResult!['records'],
      };

      final res = await ApiService.confirmBulkImport(reqBody);
      setState(() {
        issuedCount = res['total_issued'] ?? 0;
        stage = 3;
      });
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
        title: 'BULK STUDENT ENTRY',
        subtitle: 'Step ${stage + 1} of 3 • Event Details & Import',
        onBack: widget.onBack,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Step Indicators
            Row(
              children: [
                _stepIndicator(1, 'Event Details', stage >= 0),
                _stepDivider(),
                _stepIndicator(2, 'Excel Import', stage >= 1),
                _stepDivider(),
                _stepIndicator(3, 'Confirm', stage >= 2),
              ],
            ),
            const SizedBox(height: 20),

            if (stage == 0) _buildStage0EventDetails(),
            if (stage == 1) _buildStage1ExcelUpload(),
            if (stage == 2) _buildStage2ReviewAndConfirm(),
            if (stage == 3) _buildStage3Success(),
          ],
        ),
      ),
    );
  }

  Widget _stepIndicator(int num, String label, bool isActive) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: isActive ? AppColors.blue : AppColors.line,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$num',
                style: TextStyle(
                  color: isActive ? Colors.white : AppColors.textMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: isActive ? AppColors.blue : AppColors.textMuted,
              fontSize: 9,
              fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _stepDivider() {
    return Container(width: 24, height: 1, color: AppColors.line);
  }

  Widget _buildStage0EventDetails() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Enter Event Details', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.navy)),
          const Text('Required before importing student roster', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
          const SizedBox(height: 14),

          _inputField('Event / Symposium Name *', _eventNameController),
          const SizedBox(height: 10),
          _inputField('Event Purpose *', _eventPurposeController),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _inputField('From Date', _fromDateController)),
              const SizedBox(width: 8),
              Expanded(child: _inputField('To Date', _toDateController)),
            ],
          ),
          const SizedBox(height: 10),
          _inputField('Department Coordinator', _coordNameController),
          const SizedBox(height: 10),
          _inputField('Coordinator Phone Number', _coordPhoneController),
          const SizedBox(height: 20),

          AppButton(
            text: 'Continue to Excel Import',
            onPressed: () => setState(() => stage = 1),
            icon: const Icon(Icons.arrow_forward, size: 16, color: Colors.white),
          ),
        ],
      ),
    );
  }

  Widget _buildStage1ExcelUpload() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Template Info Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Student-list Template Format', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.text)),
              SizedBox(height: 4),
              Text(
                'Excel must contain columns: Name, Number, Address, and Photo File Path in sheet named "student-list".',
                style: TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.4),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Upload Card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.blue.withOpacity(0.4), width: 1.5),
          ),
          child: Column(
            children: [
              const Icon(Icons.upload_file, size: 40, color: AppColors.blue),
              const SizedBox(height: 10),
              Text(
                selectedFileName ?? 'Upload Excel Spreadsheet (.xlsx)',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.text),
              ),
              const SizedBox(height: 4),
              const Text('Accepts .xlsx format up to 10 MB', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.blueLight, elevation: 0),
                onPressed: _pickExcelFile,
                icon: const Icon(Icons.folder_open, size: 16, color: AppColors.blue),
                label: const Text('Browse Files', style: TextStyle(color: AppColors.blue, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        if (previewResult != null) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.greenBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: AppColors.green, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Parsed ${previewResult!['valid_records']} valid records (${previewResult!['error_records']} errors)',
                    style: const TextStyle(color: AppColors.green, fontWeight: FontWeight.w700, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          AppButton(
            text: 'Review & Confirm Passes',
            onPressed: () => setState(() => stage = 2),
            icon: const Icon(Icons.arrow_forward, size: 16, color: Colors.white),
          ),
        ],

        if (_errorMessage != null) ...[
          const SizedBox(height: 10),
          Text(_errorMessage!, style: const TextStyle(color: AppColors.redText, fontSize: 11)),
        ],
      ],
    );
  }

  Widget _buildStage2ReviewAndConfirm() {
    final records = previewResult?['records'] as List? ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Review Students to Issue (${records.length} total)',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.navy),
              ),
              const SizedBox(height: 12),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollExceptionScrollPhysics(),
                itemCount: records.take(5).length,
                separatorBuilder: (_, __) => const Divider(color: AppColors.line),
                itemBuilder: (context, index) {
                  final r = records[index];
                  final name = r['name'] ?? '';
                  final num = r['number'] ?? '';
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.text)),
                      Text(num, style: const TextStyle(fontSize: 11, color: AppColors.blue, fontWeight: FontWeight.w600)),
                    ],
                  );
                },
              ),
              if (records.length > 5) ...[
                const SizedBox(height: 8),
                Text('+ ${records.length - 5} more records', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 18),

        if (_errorMessage != null) ...[
          Text(_errorMessage!, style: const TextStyle(color: AppColors.redText, fontSize: 11)),
          const SizedBox(height: 10),
        ],

        AppButton(
          text: 'Confirm & Issue All Passes',
          onPressed: _confirmBulkIssuance,
          isLoading: _isLoading,
          icon: const Icon(Icons.check, size: 16, color: Colors.white),
        ),
      ],
    );
  }

  Widget _buildStage3Success() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(color: AppColors.greenBg, shape: BoxShape.circle),
            child: const Icon(Icons.check, color: AppColors.green, size: 36),
          ),
          const SizedBox(height: 14),
          const Text('Bulk Passes Issued!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 6),
          Text('Successfully generated $issuedCount passes with unique pass numbers.', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(height: 24),
          AppButton(
            text: 'View Pass Records',
            onPressed: widget.onFinished,
          ),
        ],
      ),
    );
  }

  Widget _inputField(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B))),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          style: const TextStyle(fontSize: 12),
          decoration: InputDecoration(
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.line)),
          ),
        ),
      ],
    );
  }
}
