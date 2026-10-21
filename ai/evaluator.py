import time
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import numpy as np
from typing import Dict, Any
from ai.detector import FaceDetector
from ai.embedder import FaceEmbedder
from ai.matcher import FaceMatcher
from ai.liveness import LivenessEvaluator


def run_ai_benchmarks() -> Dict[str, Any]:
    """
    Measures execution latency for:
    - Face Detection
    - Embedding Generation
    - Vector Matching (NumPy vs FAISS benchmark across 10, 100, 1,000 identities)
    - Liveness Evaluation
    """
    # Create synthetic test face crop (112x112 BGR)
    synthetic_face = np.random.randint(60, 200, (112, 112, 3), dtype=np.uint8)

    detector = FaceDetector()
    embedder = FaceEmbedder()
    matcher = FaceMatcher()
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
        # Generate synthetic gallery embeddings
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

    results = {
        "detection_latency_ms": round(detect_latency_ms, 2),
        "embedding_latency_ms": round(embed_latency_ms, 2),
        "liveness_latency_ms": round(liveness_latency_ms, 2),
        "matching_benchmarks": gallery_benchmarks,
        "total_estimated_pipeline_ms": round(total_pipeline_ms, 2),
    }
    return results


if __name__ == "__main__":
    benchmark_results = run_ai_benchmarks()
    print("AI Benchmark Results:")
    for k, v in benchmark_results.items():
        print(f"  {k}: {v}")
