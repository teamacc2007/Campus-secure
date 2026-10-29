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
        Returns:
            (best_matched_identity, similarity_score, decision)
            decision is one of: "MATCH", "UNCERTAIN_REVIEW", "NO_MATCH"
        """
        if probe_embedding is None or len(gallery) == 0:
            return None, 0.0, "NO_MATCH"

        best_score = -1.0
        best_candidate = None

        for item in gallery:
            target_emb = item.get("embedding")
            if target_emb is None:
                continue
            if isinstance(target_emb, list):
                target_emb = np.array(target_emb, dtype=np.float32)

            score = self.cosine_similarity(probe_embedding, target_emb)
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
