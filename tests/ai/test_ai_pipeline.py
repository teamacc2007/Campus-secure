import sys
import os
import pytest
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ai.detector import FaceDetector
from ai.embedder import FaceEmbedder
from ai.matcher import FaceMatcher
from ai.liveness import LivenessEvaluator


def test_face_detector_synthetic():
    detector = FaceDetector()
    test_img = np.zeros((200, 200, 3), dtype=np.uint8)
    # Empty black image should return 0 faces
    faces = detector.detect_faces(test_img)
    assert isinstance(faces, list)


def test_face_embedder_vector_shape():
    embedder = FaceEmbedder()
    test_face = np.random.randint(50, 200, (112, 112, 3), dtype=np.uint8)
    embedding = embedder.extract_embedding(test_face)
    assert isinstance(embedding, np.ndarray)
    assert embedding.shape[0] in (128, 512)
    # Verify vector is L2 normalized
    norm = np.linalg.norm(embedding)
    assert np.isclose(norm, 1.0, atol=1e-3)


def test_face_matcher_exact_and_different():
    matcher = FaceMatcher(match_threshold=0.68)
    v1 = np.random.randn(128).astype(np.float32)
    v1 = v1 / np.linalg.norm(v1)

    gallery = [
        {"id": 1, "name": "Target Person", "embedding": v1.copy()},
        {"id": 2, "name": "Other Person", "embedding": -v1.copy()},
    ]

    best, score, decision = matcher.find_best_match(v1, gallery)
    assert best["name"] == "Target Person"
    assert np.isclose(score, 1.0, atol=1e-3)
    assert decision == "MATCH"


def test_liveness_evaluator_checks():
    liveness = LivenessEvaluator()
    # Sharp random image
    test_face = np.random.randint(40, 220, (112, 112, 3), dtype=np.uint8)
    result = liveness.evaluate(test_face)
    assert "is_live" in result
    assert "confidence" in result
    assert "checks" in result
    assert isinstance(result["checks"], dict)
