import os
import cv2
import numpy as np
from typing import Optional
import onnxruntime as ort


class FaceEmbedder:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.session = None

        if model_path and os.path.exists(model_path):
            try:
                # Initialize ONNX Runtime session
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                self.session = ort.InferenceSession(model_path, opts, providers=["CPUExecutionProvider"])
                self.input_name = self.session.get_inputs()[0].name
                self.output_name = self.session.get_outputs()[0].name
            except Exception as e:
                print(f"[FaceEmbedder] Failed to initialize ONNX Runtime session: {e}. Using deterministic feature extractor.")
                self.session = None

    def extract_embedding(self, face_crop: np.ndarray) -> np.ndarray:
        """
        Extracts a normalized 128-d or 512-d embedding from an aligned face crop.
        """
        if face_crop is None or face_crop.size == 0:
            raise ValueError("Invalid face crop image.")

        if self.session is not None:
            # Preprocess for typical MobileFaceNet / ArcFace: 112x112 RGB, normalized to [-1, 1]
            img = cv2.resize(face_crop, (112, 112))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = (img.astype(np.float32) - 127.5) / 128.0
            img = np.transpose(img, (2, 0, 1))  # (3, 112, 112)
            input_tensor = np.expand_dims(img, axis=0)  # (1, 3, 112, 112)

            outputs = self.session.run([self.output_name], {self.input_name: input_tensor})
            embedding = outputs[0].flatten()
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            return embedding

        # Deterministic feature representation from aligned face crop (mean/std in grids)
        resized = cv2.resize(face_crop, (64, 64))
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        blocks = []
        for r in range(4):
            for c in range(4):
                block = gray[r*16:(r+1)*16, c*16:(c+1)*16]
                blocks.extend([float(np.mean(block)), float(np.std(block))])
        
        # Expand and normalize to 128-dimensional unit vector
        vec = np.tile(np.array(blocks, dtype=np.float32), 4)[:128]
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec
