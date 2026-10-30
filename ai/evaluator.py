import time
import sys
import os
import cv2
import json
import numpy as np
from typing import Dict, Any

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.detector import FaceDetector
from ai.embedder import FaceEmbedder
from ai.matcher import FaceMatcher
from ai.liveness import LivenessEvaluator


def run_ai_benchmarks() -> Dict[str, Any]:
    synthetic_face = np.random.randint(60, 200, (112, 112, 3), dtype=np.uint8)

    detector = FaceDetector()
    embedder = FaceEmbedder()
    matcher = FaceMatcher(match_threshold=0.65)
    liveness = LivenessEvaluator()

    # 1. Benchmark Detection
    t0 = time.perf_counter()
    for _ in range(5):
        _ = detector.detect_faces(synthetic_face)
    detect_latency_ms = ((time.perf_counter() - t0) / 5) * 1000

    # 2. Benchmark Embedding Generation
    t0 = time.perf_counter()
    for _ in range(10):
        probe_emb = embedder.extract_embedding(synthetic_face)
    embed_latency_ms = ((time.perf_counter() - t0) / 10) * 1000

    # 3. Benchmark Liveness
    t0 = time.perf_counter()
    for _ in range(10):
        _ = liveness.evaluate(synthetic_face)
    liveness_latency_ms = ((time.perf_counter() - t0) / 10) * 1000

    # 4. Benchmark Matching across gallery sizes
    gallery_benchmarks = {}
    for size in [10, 100, 1000]:
        gallery = [
            {"id": i, "name": f"User_{i}", "embedding": np.random.randn(128).astype(np.float32)}
            for i in range(size)
        ]
        t0 = time.perf_counter()
        for _ in range(20):
            _, _, _ = matcher.find_best_match(probe_emb, gallery)
        match_latency_ms = ((time.perf_counter() - t0) / 20) * 1000
        gallery_benchmarks[f"gallery_{size}_items_ms"] = round(match_latency_ms, 3)

    total_pipeline_ms = detect_latency_ms + embed_latency_ms + liveness_latency_ms + gallery_benchmarks["gallery_100_items_ms"]

    return {
        "detection_latency_ms": round(detect_latency_ms, 2),
        "embedding_latency_ms": round(embed_latency_ms, 2),
        "liveness_latency_ms": round(liveness_latency_ms, 2),
        "matching_benchmarks": gallery_benchmarks,
        "total_estimated_pipeline_ms": round(total_pipeline_ms, 2),
    }


def evaluate_enrolled_identities() -> Dict[str, Any]:
    detector = FaceDetector()
    embedder = FaceEmbedder()
    matcher = FaceMatcher(match_threshold=0.65)

    identities = ["sur", "mon", "mith", "thiru"]
    enrolled_embeddings = {}
    probe_embeddings = {}
    landmarks_detected = {}

    for name in identities:
        crop_img = cv2.imread(f"public/faces/{name}_crop.jpg")
        full_img = cv2.imread(f"public/faces/{name}.jpg")

        faces_c = sorted(detector.detect_faces(crop_img), key=lambda f: f["box"][2] * f["box"][3], reverse=True)
        enrolled_embeddings[name] = embedder.extract_embedding(crop_img, faces_c[0]) if faces_c else embedder.extract_embedding(crop_img)

        faces_f = sorted(detector.detect_faces(full_img), key=lambda f: f["box"][2] * f["box"][3], reverse=True)
        if faces_f:
            probe_embeddings[name] = embedder.extract_embedding(full_img, faces_f[0])
            landmarks_detected[name] = len(faces_f[0]["landmarks"])
        else:
            probe_embeddings[name] = embedder.extract_embedding(full_img)
            landmarks_detected[name] = 0

    # Genuine comparisons
    genuine_scores = {}
    for name in identities:
        sim = matcher.cosine_similarity(probe_embeddings[name], enrolled_embeddings[name])
        genuine_scores[name] = round(sim, 4)

    # Impostor cross-comparisons
    impostor_scores = {}
    for p in identities:
        impostor_scores[p] = {}
        for g in identities:
            if p != g:
                sim = matcher.cosine_similarity(probe_embeddings[p], enrolled_embeddings[g])
                impostor_scores[p][g] = round(sim, 4)

    min_genuine = min(genuine_scores.values())
    max_impostor = max(max(sub.values()) for sub in impostor_scores.values())
    separation_margin = round(min_genuine - max_impostor, 4)

    threshold = 0.65
    genuine_accepts = sum(1 for s in genuine_scores.values() if s >= threshold)
    false_accepts = sum(
        1 for sub in impostor_scores.values() for s in sub.values() if s >= threshold
    )

    # Spectacles evaluation
    spectacles_results = {}
    for name in identities:
        full_img = cv2.imread(f"public/faces/{name}.jpg")
        faces_f = sorted(detector.detect_faces(full_img), key=lambda f: f["box"][2] * f["box"][3], reverse=True)
        if faces_f:
            f = faces_f[0]
            lm = f["landmarks"]
            re, le = lm[0], lm[1]
            dist = int(np.linalg.norm(np.array(re) - np.array(le)))
            rad = int(dist * 0.32)
            spec_img = full_img.copy()
            cv2.circle(spec_img, (int(re[0]), int(re[1])), rad, (30, 30, 30), 2)
            cv2.circle(spec_img, (int(le[0]), int(le[1])), rad, (30, 30, 30), 2)
            cv2.line(spec_img, (int(re[0]) + rad - 2, int(re[1])), (int(le[0]) - rad + 2, int(le[1])), (30, 30, 30), 2)
            faces_s = sorted(detector.detect_faces(spec_img), key=lambda f: f["box"][2] * f["box"][3], reverse=True)
            if faces_s:
                emb_s = embedder.extract_embedding(spec_img, faces_s[0])
                sim = matcher.cosine_similarity(emb_s, enrolled_embeddings[name])
                spectacles_results[name] = round(sim, 4)

    return {
        "identities_evaluated": len(identities),
        "total_photographs": len(identities) * 2,
        "landmarks_detection_rate": {k: f"{v}/5 points" for k, v in landmarks_detected.items()},
        "genuine_scores": genuine_scores,
        "spectacles_scores": spectacles_results,
        "impostor_scores": impostor_scores,
        "min_genuine_score": min_genuine,
        "max_impostor_score": max_impostor,
        "separation_margin": separation_margin,
        "calibrated_threshold": threshold,
        "genuine_acceptance_rate": f"{(genuine_accepts / len(identities)) * 100:.1f}%",
        "false_acceptance_rate": f"{(false_accepts / 12) * 100:.1f}%",
    }


if __name__ == "__main__":
    benchmarks = run_ai_benchmarks()
    evaluation = evaluate_enrolled_identities()
    print("=== AI BENCHMARK RESULTS ===")
    print(json.dumps(benchmarks, indent=2))
    print("\n=== ENROLLED IDENTITIES EVALUATION ===")
    print(json.dumps(evaluation, indent=2))
