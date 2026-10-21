import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../widgets/top_bar.dart';
import '../widgets/status_badge.dart';

class LogsScreen extends StatefulWidget {
  final String role;
  final VoidCallback onBack;

  const LogsScreen({
    Key? key,
    required this.role,
    required this.onBack,
  }) : super(key: key);

  @override
  State<LogsScreen> createState() => _LogsScreenState();
}

class _LogsScreenState extends State<LogsScreen> {
  String selectedFilter = 'All';
  final _searchController = TextEditingController();
  List<dynamic> logs = [];
  bool isLoading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() {
      isLoading = true;
      error = null;
    });

    try {
      final res = await ApiService.getAccessLogs(
        personType: selectedFilter == 'All' ? null : selectedFilter,
        query: _searchController.text.trim(),
      );
      setState(() {
        logs = res;
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

  StatusTone _getReviewTone(String status) {
    if (status == 'Verified') return StatusTone.green;
    if (status == 'Pending Verification') return StatusTone.amber;
    if (status == 'Unauthorised' || status == 'Revoked') return StatusTone.red;
    return StatusTone.gray;
  }

  @override
  Widget build(BuildContext context) {
    final filters = ['All', 'Student', 'Staff', 'Visitor'];

    return Scaffold(
      appBar: TopBar(
        title: 'CAMPUS ACCESS LOGS',
        subtitle: 'Entry & Exit Verification History',
        onBack: widget.onBack,
        action: IconButton(
          icon: const Icon(Icons.refresh, color: AppColors.blue, size: 20),
          onPressed: _loadLogs,
        ),
      ),
      body: Column(
        children: [
          // Search & Filter header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  onSubmitted: (_) => _loadLogs(),
                  decoration: InputDecoration(
                    hintText: 'Search name, reg number, or pass...',
                    hintStyle: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.textMuted),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.line)),
                  ),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: filters.map((f) {
                      final isSelected = selectedFilter == f;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(f, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500, color: isSelected ? Colors.white : AppColors.text)),
                          selected: isSelected,
                          selectedColor: AppColors.blue,
                          backgroundColor: AppColors.surface,
                          side: BorderSide(color: isSelected ? AppColors.blue : AppColors.line),
                          onSelected: (selected) {
                            if (selected) {
                              setState(() => selectedFilter = f);
                              _loadLogs();
                            }
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.line),

          // Log list
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : error != null
                    ? Center(child: Text(error!, style: const TextStyle(color: AppColors.redText)))
                    : logs.isEmpty
                        ? const Center(child: Text('No access records found', style: TextStyle(color: AppColors.textMuted, fontSize: 13)))
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: logs.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final item = logs[index];
                              final statusStr = item['review_status'] ?? 'Verified';
                              final personType = item['person_type'] ?? 'Student';
                              final name = item['name'] ?? 'Unknown';
                              final ident = item['identifier_value'] ?? '';
                              final location = item['location_block'] ?? 'Gate 1';
                              final timestamp = item['timestamp'] ?? '';

                              return Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: AppColors.line),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppColors.blueLight,
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(personType, style: const TextStyle(color: AppColors.blue, fontSize: 9, fontWeight: FontWeight.w700)),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(ident, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                                          ],
                                        ),
                                        StatusBadge(
                                          tone: _getReviewTone(statusStr),
                                          label: statusStr,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(name, style: const TextStyle(color: AppColors.text, fontSize: 13, fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 4),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            const Icon(Icons.location_on_outlined, size: 12, color: AppColors.textMuted),
                                            const SizedBox(width: 4),
                                            Text(location, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
                                          ],
                                        ),
                                        Text(
                                          timestamp.toString().length > 16 ? timestamp.toString().substring(0, 16).replaceAll('T', ' ') : timestamp.toString(),
                                          style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}
