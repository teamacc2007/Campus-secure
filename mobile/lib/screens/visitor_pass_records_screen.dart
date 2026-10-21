import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../widgets/top_bar.dart';
import '../widgets/status_badge.dart';

class VisitorPassRecordsScreen extends StatefulWidget {
  final VoidCallback onBack;
  final Function(Map<String, dynamic> pass) onOpenPass;

  const VisitorPassRecordsScreen({
    Key? key,
    required this.onBack,
    required this.onOpenPass,
  }) : super(key: key);

  @override
  State<VisitorPassRecordsScreen> createState() => _VisitorPassRecordsScreenState();
}

class _VisitorPassRecordsScreenState extends State<VisitorPassRecordsScreen> {
  String selectedStatus = 'All';
  final _searchController = TextEditingController();
  List<dynamic> passes = [];
  bool isLoading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadPasses();
  }

  Future<void> _loadPasses() async {
    setState(() {
      isLoading = true;
      error = null;
    });

    try {
      final res = await ApiService.getVisitorPasses(
        status: selectedStatus == 'All' ? null : selectedStatus,
        query: _searchController.text.trim(),
      );
      setState(() {
        passes = res;
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

  StatusTone _getStatusTone(String status) {
    if (status == 'Active') return StatusTone.green;
    if (status == 'Cancelled') return StatusTone.red;
    return StatusTone.gray;
  }

  @override
  Widget build(BuildContext context) {
    final statusList = ['All', 'Active', 'Cancelled', 'Expired'];

    return Scaffold(
      appBar: TopBar(
        title: 'VISITOR PASS RECORDS',
        subtitle: 'Institution Issued Passes',
        onBack: widget.onBack,
        action: IconButton(
          icon: const Icon(Icons.refresh, color: AppColors.blue, size: 20),
          onPressed: _loadPasses,
        ),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  onSubmitted: (_) => _loadPasses(),
                  decoration: InputDecoration(
                    hintText: 'Search visitor name, pass number, or phone...',
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
                    children: statusList.map((s) {
                      final isSelected = selectedStatus == s;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(s, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500, color: isSelected ? Colors.white : AppColors.text)),
                          selected: isSelected,
                          selectedColor: AppColors.blue,
                          backgroundColor: AppColors.surface,
                          side: BorderSide(color: isSelected ? AppColors.blue : AppColors.line),
                          onSelected: (selected) {
                            if (selected) {
                              setState(() => selectedStatus = s);
                              _loadPasses();
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

          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : error != null
                    ? Center(child: Text(error!, style: const TextStyle(color: AppColors.redText)))
                    : passes.isEmpty
                        ? const Center(child: Text('No visitor passes found', style: TextStyle(color: AppColors.textMuted, fontSize: 13)))
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: passes.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final p = passes[index];
                              final passNum = p['pass_number'] ?? '';
                              final name = p['visitor_name'] ?? '';
                              final phone = p['visitor_phone'] ?? '';
                              final purpose = p['purpose'] ?? '';
                              final status = p['status'] ?? 'Active';
                              final sDate = p['start_date'] ?? '';
                              final eDate = p['end_date'] ?? '';

                              return InkWell(
                                onTap: () => widget.onOpenPass(p),
                                borderRadius: BorderRadius.circular(14),
                                child: Container(
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
                                          Text(
                                            passNum,
                                            style: const TextStyle(
                                              color: AppColors.blue,
                                              fontSize: 13,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          StatusBadge(
                                            tone: _getStatusTone(status),
                                            label: status,
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        name,
                                        style: const TextStyle(
                                          color: AppColors.text,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        purpose,
                                        style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('Phone: $phone', style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
                                          Text('$sDate to $eDate', style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
                                        ],
                                      ),
                                    ],
                                  ),
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
