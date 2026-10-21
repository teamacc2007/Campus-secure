import 'package:flutter/material.dart';
import '../config/theme.dart';

enum StatusTone { green, amber, red, blue, gray }

class StatusBadge extends StatelessWidget {
  final StatusTone tone;
  final String label;

  const StatusBadge({
    Key? key,
    required this.tone,
    required this.label,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;

    switch (tone) {
      case StatusTone.green:
        bg = AppColors.greenBg;
        fg = AppColors.green;
        break;
      case StatusTone.amber:
        bg = AppColors.amberBg;
        fg = AppColors.amber;
        break;
      case StatusTone.red:
        bg = AppColors.redBg;
        fg = AppColors.red;
        break;
      case StatusTone.blue:
        bg = AppColors.blueBadgeBg;
        fg = AppColors.blueBadge;
        break;
      case StatusTone.gray:
        bg = AppColors.grayBg;
        fg = AppColors.gray;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 5,
            height: 5,
            margin: const EdgeInsets.only(right: 5),
            decoration: BoxDecoration(
              color: fg,
              shape: BoxShape.circle,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 9,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
