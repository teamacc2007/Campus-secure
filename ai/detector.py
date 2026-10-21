import os
import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict, Any


class FaceDetector:
    def __init__(self, model_path: Optional[str] = None, score_threshold: float = 0.6):
        self.score_threshold = score_threshold
        self.model_path = model_path
        self.yunet = None

        if model_path and os.path.exists(model_path):
            try:
                self.yunet = cv2.FaceDetectorYN.create(
                    model=model_path,
                    config="",
                    input_size=(320, 320),
                    score_threshold=score_threshold,
                    nms_threshold=0.3,
                    top_k=5000,
                )
            except Exception as e:
                print(f"[FaceDetector] Failed to load YuNet model: {e}. Falling back to OpenCV Cascade.")
                self.yunet = None

        # Fallback detector
        self.haar_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

    def detect_faces(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detects faces in a BGR image.
        Returns a list of dicts with:
          - 'box': (x, y, w, h)
          - 'confidence': float
          - 'landmarks': list of (x, y) if available
        """
        if image is None or image.size == 0:
            return []

        h, w = image.shape[:2]
        faces = []

        if self.yunet is not None:
            self.yunet.setInputSize((w, h))
            _, detections = self.yunet.detect(image)
            if detections is not None:
                for det in detections:
                    confidence = float(det[-1])
                    if confidence >= self.score_threshold:
                        box = (int(det[0]), int(det[1]), int(det[2]), int(det[3]))
                        # 5 landmarks: right eye, left eye, nose tip, right mouth, left mouth
                        landmarks = [
                            (float(det[4]), float(det[5])),
                            (float(det[6]), float(det[7])),
                            (float(det[8]), float(det[9])),
                            (float(det[10]), float(det[11])),
                            (float(det[12]), float(det[13])),
                        ]
                        faces.append({
                            "box": box,
                            "confidence": confidence,
                            "landmarks": landmarks,
                        })
                return faces

        # Fallback to Haar Cascade
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        detected = self.haar_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
        )
        for (x, y, fw, fh) in detected:
            faces.append({
                "box": (int(x), int(y), int(fw), int(fh)),
                "confidence": 0.85,
                "landmarks": [],
            })

        return faces
