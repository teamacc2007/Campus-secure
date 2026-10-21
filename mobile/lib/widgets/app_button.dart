import 'package:flutter/material.dart';
import '../config/theme.dart';

enum ButtonVariant { primary, secondary, danger, warning }

class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final Widget? icon;
  final bool isLoading;

  const AppButton({
    Key? key,
    required this.text,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.icon,
    this.isLoading = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (variant == ButtonVariant.primary) {
      return Container(
        width: double.infinity,
        height: 50,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(13),
          gradient: const LinearGradient(
            colors: [Color(0xFF2B6EF1), Color(0xFF174CA9)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.blue.withOpacity(0.2),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
          ),
          onPressed: isLoading ? null : onPressed,
          child: _buildContent(Colors.white),
        ),
      );
    }

    Color bgColor = Colors.white;
    Color textColor = AppColors.blue;
    Color borderColor = AppColors.line;

    if (variant == ButtonVariant.secondary) {
      bgColor = Colors.white;
      textColor = const Color(0xFF1D57AD);
      borderColor = const Color(0xFFD6DFEB);
    } else if (variant == ButtonVariant.danger) {
      bgColor = const Color(0xFFFFF1F2);
      textColor = AppColors.redText;
      borderColor = const Color(0xFFF0C7CA);
    } else if (variant == ButtonVariant.warning) {
      bgColor = const Color(0xFFFFF7E8);
      textColor = const Color(0xFF8B5404);
      borderColor = const Color(0xFFECD29F);
    }

    return Container(
      width: double.infinity,
      height: 50,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: borderColor),
      ),
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          side: BorderSide.none,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
        ),
        onPressed: isLoading ? null : onPressed,
        child: _buildContent(textColor),
      ),
    );
  }

  Widget _buildContent(Color color) {
    if (isLoading) {
      return SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2, color: color),
      );
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[
          icon!,
          const SizedBox(width: 8),
        ],
        Text(
          text,
          style: TextStyle(
            color: color,
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
