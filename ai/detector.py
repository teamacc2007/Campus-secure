import os
import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict, Any


class FaceDetector:
    def __init__(self, model_path: Optional[str] = None, score_threshold: float = 0.6):
        self.score_threshold = score_threshold
        if model_path is None:
            default_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "models/face_detection_yunet_2023mar.onnx")
            )
            if os.path.exists(default_path):
                model_path = default_path
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
          - 'landmarks': list of 5 (x, y) tuples if available:
            [right_eye, left_eye, nose_tip, right_mouth, left_mouth]
          - 'raw': raw detection array from detector (if available)
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
                            "raw": det,
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
                "raw": None,
            })

        return faces

    @staticmethod
    def align_face(
        image: np.ndarray,
        face_info: Dict[str, Any],
        output_size: Tuple[int, int] = (112, 112),
    ) -> np.ndarray:
        """
        Aligns and crops face using detected facial landmarks (or bounding box if landmarks absent).
        Maps eye landmarks to canonical coordinates for rotation/scale invariance.
        """
        landmarks = face_info.get("landmarks", [])
        if len(landmarks) >= 2:
            # Canonical alignment:
            # Landmark 0: right eye, Landmark 1: left eye
            right_eye = np.array(landmarks[0], dtype=np.float32)
            left_eye = np.array(landmarks[1], dtype=np.float32)

            dY = left_eye[1] - right_eye[1]
            dX = left_eye[0] - right_eye[0]
            angle = float(np.degrees(np.arctan2(dY, dX)))

            desired_left_eye_x = 0.70
            desired_right_eye_x = 0.30
            desired_eye_y = 0.38
            desired_dist = (desired_left_eye_x - desired_right_eye_x) * output_size[0]

            dist = float(np.sqrt((dX ** 2) + (dY ** 2)))
            scale = desired_dist / max(dist, 1e-4)

            eyes_center = (
                float((right_eye[0] + left_eye[0]) / 2.0),
                float((right_eye[1] + left_eye[1]) / 2.0),
            )
            M = cv2.getRotationMatrix2D(eyes_center, angle, scale)

            tX = output_size[0] * 0.5
            tY = output_size[1] * desired_eye_y
            M[0, 2] += (tX - eyes_center[0])
            M[1, 2] += (tY - eyes_center[1])

            aligned = cv2.warpAffine(
                image, M, output_size, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT
            )
            return aligned

        # Fallback to bounding box crop
        x, y, w, h = face_info["box"]
        ih, iw = image.shape[:2]
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(iw, x + w), min(ih, y + h)
        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            return cv2.resize(image, output_size)
        return cv2.resize(crop, output_size)
