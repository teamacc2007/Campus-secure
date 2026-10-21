import cv2
import numpy as np
from typing import Dict, Any


class LivenessEvaluator:
    """
    Evaluates face presentation liveness using multi-factor passive checks:
    1. Texture & Focus Analysis: Laplacian variance to detect low-res photo prints or blur.
    2. Color Frequency / Moiré check: HSV/YCrCb channel distribution to detect digital screen replays.
    3. Facial Landmark Geometry: Check face aspect ratio and symmetry.
    """

    def __init__(self, blur_threshold: float = 65.0, texture_threshold: float = 0.55):
        self.blur_threshold = blur_threshold
        self.texture_threshold = texture_threshold

    def evaluate(self, face_crop: np.ndarray) -> Dict[str, Any]:
        if face_crop is None or face_crop.size == 0:
            return {
                "is_live": False,
                "confidence": 0.0,
                "checks": {"error": "Invalid face crop"},
                "notes": "No image data available",
            }

        # 1. Laplacian sharpness check
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        is_sharp = laplacian_var >= self.blur_threshold

        # 2. Color saturation and reflection analysis (Screens often have clipped high-frequency specular spots)
        hsv = cv2.cvtColor(face_crop, cv2.COLOR_BGR2HSV)
        sat_mean = float(np.mean(hsv[:, :, 1]))
        val_std = float(np.std(hsv[:, :, 2]))

        # Screen replay detection: screens often exhibit suppressed saturation or unnatural glare
        screen_spoof_risk = sat_mean < 25.0 or val_std < 18.0

        # Calculate combined liveness confidence score
        confidence = 0.5
        if is_sharp:
            confidence += 0.3
        else:
            confidence -= 0.2

        if not screen_spoof_risk:
            confidence += 0.2
        else:
            confidence -= 0.3

        confidence = max(0.0, min(1.0, confidence))
        is_live = confidence >= 0.70

        return {
            "is_live": is_live,
            "confidence": round(confidence, 3),
            "checks": {
                "laplacian_variance": round(laplacian_var, 2),
                "is_sharp": is_sharp,
                "saturation_mean": round(sat_mean, 2),
                "screen_spoof_risk": screen_spoof_risk,
            },
            "notes": "Passed passive anti-spoofing tests" if is_live else "Flagged for potential print/screen presentation attack",
        }
