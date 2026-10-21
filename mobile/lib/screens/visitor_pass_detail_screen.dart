import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../widgets/top_bar.dart';
import '../widgets/app_button.dart';
import '../widgets/status_badge.dart';

class VisitorPassDetailScreen extends StatefulWidget {
  final Map<String, dynamic> pass;
  final VoidCallback onBack;
  final VoidCallback onPassCancelled;

  const VisitorPassDetailScreen({
    Key? key,
    required this.pass,
    required this.onBack,
    required this.onPassCancelled,
  }) : super(key: key);

  @override
  State<VisitorPassDetailScreen> createState() => _VisitorPassDetailScreenState();
}

class _VisitorPassDetailScreenState extends State<VisitorPassDetailScreen> {
  final _reasonController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  StatusTone _getStatusTone(String status) {
    if (status == 'Active') return StatusTone.green;
    if (status == 'Cancelled') return StatusTone.red;
    return StatusTone.gray;
  }

  void _showCancelDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Visitor Pass', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Please provide a mandatory operational reason for cancelling this pass:',
              style: TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _reasonController,
              maxLines: 2,
              style: const TextStyle(fontSize: 12),
              decoration: InputDecoration(
                hintText: 'e.g. Event postponed by department coordinator',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Back'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.red),
            onPressed: () async {
              if (_reasonController.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              await _cancelPass();
            },
            child: const Text('Confirm Cancel', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _cancelPass() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final passId = widget.pass['id'];
      await ApiService.cancelVisitorPass(passId, _reasonController.text.trim());
      widget.onPassCancelled();
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
    final p = widget.pass;
    final passNum = p['pass_number'] ?? '';
    final name = p['visitor_name'] ?? '';
    final phone = p['visitor_phone'] ?? '';
    final purpose = p['purpose'] ?? '';
    final status = p['status'] ?? 'Active';
    final sDate = p['start_date'] ?? '';
    final eDate = p['end_date'] ?? '';
    final coordinator = p['coordinator_name'] ?? '';
    final coordPhone = p['coordinator_phone'] ?? '';
    final blocks = p['accessible_blocks'] is List ? (p['accessible_blocks'] as List).join(', ') : 'All Designated Blocks';
    final cancelReason = p['cancellation_reason'];

    return Scaffold(
      appBar: TopBar(
        title: 'PASS DETAILS',
        subtitle: passNum,
        onBack: widget.onBack,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.line),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        passNum,
                        style: const TextStyle(color: AppColors.blue, fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      StatusBadge(tone: _getStatusTone(status), label: status),
                    ],
                  ),
                  const SizedBox(height: 14),

                  Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text)),
                  const SizedBox(height: 2),
                  Text('Visitor Contact: $phone', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  const SizedBox(height: 16),
                  const Divider(color: AppColors.line),
                  const SizedBox(height: 12),

                  _row('Purpose of Visit', purpose),
                  const SizedBox(height: 8),
                  _row('Validity Period', '$sDate to $eDate'),
                  const SizedBox(height: 8),
                  _row('Authorized Blocks', blocks),
                  const SizedBox(height: 8),
                  _row('Faculty Host', coordinator),
                  const SizedBox(height: 8),
                  _row('Host Phone', coordPhone),

                  if (cancelReason != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.redBg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Cancellation Reason:', style: TextStyle(color: AppColors.redText, fontSize: 11, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 2),
                          Text(cancelReason, style: const TextStyle(color: Color(0xFF8B232C), fontSize: 11)),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (_errorMessage != null) ...[
              Text(_errorMessage!, style: const TextStyle(color: AppColors.redText, fontSize: 11)),
              const SizedBox(height: 10),
            ],

            if (status == 'Active')
              AppButton(
                text: 'Cancel Visitor Pass',
                variant: ButtonVariant.danger,
                onPressed: _showCancelDialog,
                isLoading: _isLoading,
                icon: const Icon(Icons.cancel_outlined, size: 16, color: AppColors.redText),
              ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(color: AppColors.text, fontSize: 11, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}
