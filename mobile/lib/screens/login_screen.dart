import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../widgets/app_button.dart';

class LoginScreen extends StatefulWidget {
  final Function(String role, String username, String fullName) onLoginSuccess;
  final VoidCallback onForgotPassword;

  const LoginScreen({
    Key? key,
    required this.onLoginSuccess,
    required this.onForgotPassword,
  }) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String selectedRole = 'security';
  final _usernameController = TextEditingController(text: 'security');
  final _passwordController = TextEditingController(text: '12345');
  bool _isLoading = false;
  String? _errorMessage;
  bool _obscurePassword = true;

  final List<Map<String, dynamic>> roles = [
    {'id': 'security', 'title': 'Security Guard', 'desc': 'Entry/Exit Scan', 'icon': Icons.shield_outlined},
    {'id': 'supervisor', 'title': 'Campus Supervisor', 'desc': 'Guard Oversight', 'icon': Icons.analytics_outlined},
    {'id': 'warden', 'title': 'Hostel Warden', 'desc': 'Student Housing', 'icon': Icons.domain},
    {'id': 'access', 'title': 'Access Supervisor', 'desc': 'Visitor Passes', 'icon': Icons.confirmation_number_outlined},
    {'id': 'staff', 'title': 'Faculty / Staff', 'desc': 'Department ID', 'icon': Icons.badge_outlined},
    {'id': 'students', 'title': 'Student Affairs', 'desc': 'Verification Logs', 'icon': Icons.people_outline},
    {'id': 'welfare', 'title': 'Student Welfare', 'desc': 'Block Movement', 'icon': Icons.volunteer_activism_outlined},
    {'id': 'admin', 'title': 'Administrator', 'desc': 'System Setup', 'icon': Icons.manage_accounts_outlined},
    {'id': 'cso', 'title': 'Chief Security Off.', 'desc': 'Institution Security', 'icon': Icons.security_outlined},
    {'id': 'manager', 'title': 'Institute Manager', 'desc': 'Campus Directory', 'icon': Icons.apartment_outlined},
  ];

  void _selectRole(String roleId) {
    setState(() {
      selectedRole = roleId;
      _usernameController.text = roleId;
      _passwordController.text = '12345';
      _errorMessage = null;
    });
  }

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final username = _usernameController.text.trim();
      final password = _passwordController.text;
      
      final res = await ApiService.login(username, password);
      widget.onLoginSuccess(
        res['role'] ?? selectedRole,
        res['username'] ?? username,
        res['full_name'] ?? 'Authorized User',
      );
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
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0D2F60), Color(0xFF154589), Color(0xFFF5F7FB)],
            stops: [0.0, 0.29, 0.292],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // College Header Branding
                Row(
                  children: [
                    Container(
                      width: 58,
                      height: 58,
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF05142C).withOpacity(0.35),
                            blurRadius: 18,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: Image.asset(
                          'assets/images/srm-trichy-emblem.png',
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Icon(Icons.shield, color: AppColors.navy, size: 30),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'CAMPUS SECURE PORTAL',
                            style: TextStyle(
                              color: Color(0xFF5CE3A6),
                              fontSize: 8.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'SRM GROUP OF INSTITUTION TRICHY',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Login Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF112644).withOpacity(0.12),
                        blurRadius: 36,
                        offset: const Offset(0, 14),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Select Role Portal',
                        style: TextStyle(
                          color: AppColors.text,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Choose an authorized campus role to log in',
                        style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 11,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Role Grid (2 columns)
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollExceptionScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                          childAspectRatio: 1.6,
                        ),
                        itemCount: roles.length,
                        itemBuilder: (context, index) {
                          final r = roles[index];
                          final isSelected = selectedRole == r['id'];
                          return InkWell(
                            onTap: () => _selectRole(r['id']),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFFF0F6FF) : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF7DA8EE) : AppColors.line,
                                  width: isSelected ? 1.5 : 1.0,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Container(
                                        width: 28,
                                        height: 28,
                                        decoration: BoxDecoration(
                                          color: isSelected ? AppColors.blue : AppColors.blueLight,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Icon(
                                          r['icon'],
                                          size: 16,
                                          color: isSelected ? Colors.white : AppColors.blue,
                                        ),
                                      ),
                                      if (isSelected)
                                        Container(
                                          width: 16,
                                          height: 16,
                                          decoration: const BoxDecoration(
                                            color: AppColors.blue,
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(Icons.check, size: 11, color: Colors.white),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    r['title'],
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AppColors.text,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    r['desc'],
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AppColors.textMuted,
                                      fontSize: 9,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 16),

                      // Form Fields
                      const Text(
                        'Username',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B)),
                      ),
                      const SizedBox(height: 5),
                      TextField(
                        controller: _usernameController,
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: Color(0xFFDBE2EB))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: Color(0xFF6D9AE8), width: 1.5)),
                          filled: true,
                          fillColor: const Color(0xFFFBFCFE),
                        ),
                      ),
                      const SizedBox(height: 12),

                      const Text(
                        'Password',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF45546B)),
                      ),
                      const SizedBox(height: 5),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: Color(0xFFDBE2EB))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: Color(0xFF6D9AE8), width: 1.5)),
                          filled: true,
                          fillColor: const Color(0xFFFBFCFE),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, size: 18, color: const Color(0xFF728198)),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Error message if any
                      if (_errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.redBg,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(color: AppColors.redText, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(height: 10),
                      ],

                      // Sign In Button
                      AppButton(
                        text: 'Sign In to Portal',
                        onPressed: _handleLogin,
                        isLoading: _isLoading,
                        icon: const Icon(Icons.lock_outline, size: 16, color: Colors.white),
                      ),
                      const SizedBox(height: 14),

                      Center(
                        child: TextButton(
                          onPressed: widget.onForgotPassword,
                          child: const Text(
                            'Forgot credentials? Contact Administrator',
                            style: TextStyle(
                              color: AppColors.blue,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
