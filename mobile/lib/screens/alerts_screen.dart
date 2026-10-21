import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../widgets/top_bar.dart';
import '../widgets/status_badge.dart';
import '../widgets/app_button.dart';

class AlertsScreen extends StatefulWidget {
  final VoidCallback onBack;

  const AlertsScreen({
    Key? key,
    required this.onBack,
  }) : super(key: key);

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  List<dynamic> alerts = [];
  bool isLoading = true;
  String? error;
  final _reasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadAlerts();
  }

  Future<void> _loadAlerts() async {
    setState(() {
      isLoading = true;
      error = null;
    });

    try {
      final res = await ApiService.getAccessLogs(reviewStatus: 'Pending Verification');
      setState(() {
        alerts = res;
      });
    } catch (e) {
      setState(() {
        error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  void _showActionDialog(int logId, String actionType) {
    _reasonController.clear();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('$actionType Incident Record', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter reason for marking this attempt as $actionType:',
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _reasonController,
              maxLines: 2,
              style: const TextStyle(fontSize: 12),
              decoration: InputDecoration(
                hintText: 'e.g. Identity verified with hostel warden over phone',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: actionType == 'Verified' ? AppColors.green : AppColors.red,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              await _submitReview(logId, actionType, _reasonController.text.trim());
            },
            child: Text(actionType, style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _submitReview(int logId, String actionType, String reason) async {
    try {
      await ApiService.reviewAccessLog(logId, actionType, reason.isNotEmpty ? reason : 'Action taken by Supervisor');
      _loadAlerts();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update status: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(
        title: 'SECURITY ALERTS',
        subtitle: 'Pending Supervisor Verification',
        onBack: widget.onBack,
        action: IconButton(
          icon: const Icon(Icons.refresh, color: AppColors.blue, size: 20),
          onPressed: _loadAlerts,
        ),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!, style: const TextStyle(color: AppColors.redText)))
              : alerts.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.check_circle_outline, color: AppColors.green, size: 48),
                          SizedBox(height: 12),
                          Text('No Pending Incident Alerts', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.text)),
                          SizedBox(height: 4),
                          Text('All access entries are verified and clear.', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: alerts.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final alert = alerts[index];
                        final id = alert['id'];
                        final recordId = alert['record_identifier'] ?? '';
                        final name = alert['name'] ?? 'Unknown';
                        final location = alert['location_block'] ?? 'Gate 1';
                        final reason = alert['flag_reason'] ?? 'Unverified face attempt';
                        final guard = alert['guard_name'] ?? 'Gate Guard';

                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFECD29F)),
                            boxShadow: [
                              BoxShadow(color: const Color(0xFF152A4A).withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(recordId, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.navy)),
                                  const StatusBadge(tone: StatusTone.amber, label: 'PENDING VERIFICATION'),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.text)),
                              const SizedBox(height: 2),
                              Text('Flagged at: $location • Reported by: $guard', style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                              const SizedBox(height: 10),

                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF7E8),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.info_outline, size: 16, color: AppColors.amber),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(reason, style: const TextStyle(fontSize: 11, color: Color(0xFF7A4800))),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 14),

                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppColors.green,
                                        side: const BorderSide(color: AppColors.green),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                      onPressed: () => _showActionDialog(id, 'Verified'),
                                      child: const Text('Verify & Clear', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: OutlinedButton(
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppColors.red,
                                        side: const BorderSide(color: AppColors.red),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                      onPressed: () => _showActionDialog(id, 'Unauthorised'),
                                      child: const Text('Confirm Unauthorized', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
    );
  }
}
