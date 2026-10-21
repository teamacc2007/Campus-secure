import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../widgets/top_bar.dart';
import '../widgets/app_button.dart';
import '../widgets/status_badge.dart';

class ScanScreen extends StatefulWidget {
  final String role;
  final VoidCallback onBack;
  final Function(Map<String, dynamic> personData) onIdentified;
  final VoidCallback onUnrecognized;

  const ScanScreen({
    Key? key,
    required this.role,
    required this.onBack,
    required this.onIdentified,
    required this.onUnrecognized,
  }) : super(key: key);

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  bool isScanning = false;
  String verificationMethod = 'face'; // 'face' or 'register'
  final _registerController = TextEditingController(text: '22MBBS041');
  String? _errorMessage;

  Future<void> _triggerScan() async {
    setState(() {
      isScanning = true;
      _errorMessage = null;
    });

    try {
      if (verificationMethod == 'register') {
        final regNo = _registerController.text.trim();
        final res = await ApiService.verifyFace(registerNumber: regNo);
        if (res['is_recognized'] == true && res['matched_person'] != null) {
          widget.onIdentified(res['matched_person']);
        } else {
          widget.onUnrecognized();
        }
      } else {
        // Face simulation / live test
        // Test with preloaded student identity
        final res = await ApiService.verifyFace(registerNumber: '22MBBS041');
        if (res['is_recognized'] == true && res['matched_person'] != null) {
          widget.onIdentified(res['matched_person']);
        } else {
          widget.onUnrecognized();
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          isScanning = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(
        title: 'IDENTITY VERIFICATION',
        subtitle: 'Camera Face & Register Scanner',
        onBack: widget.onBack,
      ),
      body: Column(
        children: [
          // Camera viewport
          Expanded(
            child: Container(
              color: const Color(0xFF091729),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Subtle grid background
                  Positioned.fill(
                    child: Opacity(
                      opacity: 0.1,
                      child: CustomPaint(
                        painter: _GridPainter(),
                      ),
                    ),
                  ),

                  // Top Status Badge
                  Positioned(
                    top: 16,
                    child: const StatusBadge(
                      tone: StatusTone.blue,
                      label: 'GATE 1 CAMERA FEED ACTIVE',
                    ),
                  ),

                  // Face Oval Guide
                  Container(
                    width: 218,
                    height: 274,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(
                        color: const Color(0xFF58A1FF).withOpacity(0.4),
                        width: 1.5,
                      ),
                    ),
                    child: Stack(
                      children: [
                        // 4 Blue Corner Accents
                        Positioned(
                          top: 0,
                          left: 0,
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                              border: Border(
                                top: BorderSide(color: Color(0xFF58A1FF), width: 3),
                                left: BorderSide(color: Color(0xFF58A1FF), width: 3),
                              ),
                              borderRadius: BorderRadius.only(topLeft: Radius.circular(20)),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 0,
                          right: 0,
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                              border: Border(
                                top: BorderSide(color: Color(0xFF58A1FF), width: 3),
                                right: BorderSide(color: Color(0xFF58A1FF), width: 3),
                              ),
                              borderRadius: BorderRadius.only(topRight: Radius.circular(20)),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          left: 0,
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                              border: Border(
                                bottom: BorderSide(color: Color(0xFF58A1FF), width: 3),
                                left: BorderSide(color: Color(0xFF58A1FF), width: 3),
                              ),
                              borderRadius: BorderRadius.only(bottomLeft: Radius.circular(20)),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                              border: Border(
                                bottom: BorderSide(color: Color(0xFF58A1FF), width: 3),
                                right: BorderSide(color: Color(0xFF58A1FF), width: 3),
                              ),
                              borderRadius: BorderRadius.only(bottomRight: Radius.circular(20)),
                            ),
                          ),
                        ),

                        // Center Icon
                        Center(
                          child: Icon(
                            Icons.face,
                            size: 80,
                            color: Colors.white.withOpacity(0.2),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Bottom Guidance Message
                  Positioned(
                    bottom: 24,
                    child: Column(
                      children: const [
                        Text(
                          'Position Face Within Frame',
                          style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Ensure proper lighting and remove caps/sunglasses',
                          style: TextStyle(color: Color(0xFFB9C7D7), fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Control Panel
          Container(
            padding: const EdgeInsets.all(18),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.line)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Method Switcher Buttons
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => verificationMethod = 'face'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: verificationMethod == 'face' ? AppColors.blueLight : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: verificationMethod == 'face' ? AppColors.blue : AppColors.line,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.face, size: 16, color: verificationMethod == 'face' ? AppColors.blue : AppColors.textMuted),
                              const SizedBox(width: 6),
                              Text('Face Scan', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: verificationMethod == 'face' ? AppColors.blue : AppColors.textMuted)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => verificationMethod = 'register'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: verificationMethod == 'register' ? AppColors.blueLight : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: verificationMethod == 'register' ? AppColors.blue : AppColors.line,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.badge_outlined, size: 16, color: verificationMethod == 'register' ? AppColors.blue : AppColors.textMuted),
                              const SizedBox(width: 6),
                              Text('Register ID', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: verificationMethod == 'register' ? AppColors.blue : AppColors.textMuted)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                if (verificationMethod == 'register') ...[
                  TextField(
                    controller: _registerController,
                    decoration: InputDecoration(
                      hintText: 'Enter Student Reg. No or Staff ID',
                      hintStyle: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: AppColors.line)),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                if (_errorMessage != null) ...[
                  Text(_errorMessage!, style: const TextStyle(color: AppColors.redText, fontSize: 11)),
                  const SizedBox(height: 8),
                ],

                AppButton(
                  text: isScanning ? 'Verifying Identity...' : 'Scan & Verify Access',
                  onPressed: _triggerScan,
                  isLoading: isScanning,
                  icon: const Icon(Icons.qr_code_scanner, size: 16, color: Colors.white),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 0.5;
    for (double i = 0; i < size.width; i += 32) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), paint);
    }
    for (double j = 0; j < size.height; j += 32) {
      canvas.drawLine(Offset(0, j), Offset(size.width, j), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
