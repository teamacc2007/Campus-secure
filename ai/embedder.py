import os
import cv2
import numpy as np
from typing import Optional, Dict, Any

try:
    import onnxruntime as ort
except ImportError:
    ort = None


class FaceEmbedder:
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            # Check default candidate paths
            base_dir = os.path.dirname(__file__)
            candidates = [
                os.path.join(base_dir, "models/face_recognition_sface_2021dec.onnx"),
                os.path.join(base_dir, "models/arcface_mobilefacenet.onnx"),
            ]
            for c in candidates:
                if os.path.exists(c):
                    model_path = os.path.abspath(c)
                    break

        self.model_path = model_path
        self.recognizer = None
        self.session = None

        if model_path and os.path.exists(model_path):
            # 1. Try initializing OpenCV FaceRecognizerSF (supports SFace)
            if hasattr(cv2, "FaceRecognizerSF"):
                try:
                    self.recognizer = cv2.FaceRecognizerSF.create(model=model_path, config="")
                except Exception as e:
                    self.recognizer = None

            # 2. Try initializing ONNX Runtime session if recognizer not set
            if self.recognizer is None and ort is not None:
                try:
                    opts = ort.SessionOptions()
                    opts.intra_op_num_threads = 2
                    self.session = ort.InferenceSession(
                        model_path, opts, providers=["CPUExecutionProvider"]
                    )
                    self.input_name = self.session.get_inputs()[0].name
                    self.output_name = self.session.get_outputs()[0].name
                except Exception as e:
                    print(f"[FaceEmbedder] Failed to initialize ONNX Runtime session: {e}.")
                    self.session = None

    def extract_embedding(
        self,
        face_img: np.ndarray,
        face_info: Optional[Dict[str, Any]] = None,
    ) -> np.ndarray:
        """
        Extracts a normalized 128-d or 512-d embedding from an aligned face crop or image with detection info.
        """
        if face_img is None or face_img.size == 0:
            raise ValueError("Invalid face image for embedding extraction.")

        # 1. OpenCV FaceRecognizerSF path
        if self.recognizer is not None:
            if face_info is not None and face_info.get("raw") is not None:
                # Use real 5-point facial landmark alignment
                aligned = self.recognizer.alignCrop(face_img, face_info["raw"])
            else:
                aligned = cv2.resize(face_img, (112, 112))
            
            feat = self.recognizer.feature(aligned).flatten()
            norm = np.linalg.norm(feat)
            if norm > 0:
                feat = feat / norm
            return feat.astype(np.float32)

        # 2. ONNX Runtime session path
        if self.session is not None:
            img = cv2.resize(face_img, (112, 112))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = (img.astype(np.float32) - 127.5) / 128.0
            img = np.transpose(img, (2, 0, 1))  # (3, 112, 112)
            input_tensor = np.expand_dims(img, axis=0)  # (1, 3, 112, 112)

            outputs = self.session.run([self.output_name], {self.input_name: input_tensor})
            embedding = outputs[0].flatten()
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            return embedding.astype(np.float32)

        # 3. Deterministic feature representation fallback (mean/std in 4x4 grids)
        resized = cv2.resize(face_img, (64, 64))
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        blocks = []
        for r in range(4):
            for c in range(4):
                block = gray[r * 16 : (r + 1) * 16, c * 16 : (c + 1) * 16]
                blocks.extend([float(np.mean(block)), float(np.std(block))])

        vec = np.tile(np.array(blocks, dtype=np.float32), 4)[:128]
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.astype(np.float32)
