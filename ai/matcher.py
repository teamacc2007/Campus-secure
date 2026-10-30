import numpy as np
from typing import List, Tuple, Optional, Dict, Any


class FaceMatcher:
    def __init__(self, match_threshold: float = 0.65, uncertain_threshold: float = 0.50):
        self.match_threshold = match_threshold
        self.uncertain_threshold = uncertain_threshold

    @staticmethod
    def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(np.dot(v1, v2) / (norm1 * norm2))

    def find_best_match(
        self,
        probe_embedding: np.ndarray,
        gallery: List[Dict[str, Any]],
    ) -> Tuple[Optional[Dict[str, Any]], float, str]:
        """
        Matches probe embedding against enrolled identities in the gallery.
        Supports multi-template matching across all enrolled references per identity.
        Returns:
            (best_matched_identity, similarity_score, decision)
            decision is one of: "MATCH", "UNCERTAIN_REVIEW", "NO_MATCH"
        """
        if probe_embedding is None or len(gallery) == 0:
            return None, 0.0, "NO_MATCH"

        best_score = -1.0
        best_candidate = None

        for item in gallery:
            # Extract list of reference embeddings for this candidate
            embs = []
            if "embeddings" in item and item["embeddings"]:
                embs = item["embeddings"]
            elif "embedding" in item and item["embedding"] is not None:
                raw = item["embedding"]
                if isinstance(raw, list):
                    if len(raw) > 0 and isinstance(raw[0], (int, float)):
                        embs = [raw]
                    elif len(raw) > 0 and isinstance(raw[0], (list, np.ndarray)):
                        embs = raw
                elif isinstance(raw, np.ndarray):
                    if raw.ndim == 1:
                        embs = [raw]
                    elif raw.ndim == 2:
                        embs = list(raw)

            for target_emb in embs:
                target_arr = np.array(target_emb, dtype=np.float32) if not isinstance(target_emb, np.ndarray) else target_emb
                score = self.cosine_similarity(probe_embedding, target_arr)
                if score > best_score:
                    best_score = score
                    best_candidate = item

        if best_score >= self.match_threshold:
            decision = "MATCH"
        elif best_score >= self.uncertain_threshold:
            decision = "UNCERTAIN_REVIEW"
        else:
            decision = "NO_MATCH"

        return best_candidate, round(best_score, 4), decision
