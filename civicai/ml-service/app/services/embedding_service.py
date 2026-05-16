"""
embedding_service.py — SentenceTransformer embedding generation.

Interview concept:
    Semantic Embeddings vs TF-IDF:
        TF-IDF: "pothole" and "road hole" → completely different vectors
                (they share no words)
        Embeddings: "pothole" and "road hole" → very close vectors
                    (they have the same meaning)

    SentenceTransformers encodes full sentences into a dense 384-dimensional
    vector. The model (all-MiniLM-L6-v2) was trained on 1 billion sentence
    pairs using contrastive learning — sentences with similar meanings are
    pushed close together in vector space.

    This is what makes our duplicate detection SEMANTIC rather than just
    keyword-based.
"""

import numpy as np
from app.config import settings

# ─── Singleton ────────────────────────────────────────────────────────────────
_encoder = None


def load_model() -> None:
    """
    Load the SentenceTransformer model.
    Downloads ~80MB on first run, then caches locally (~/.cache/huggingface/).
    Called once during FastAPI startup.
    """
    global _encoder
    from sentence_transformers import SentenceTransformer

    print(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME} ...")
    _encoder = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
    print(f"✅ Embedding model loaded: {settings.EMBEDDING_MODEL_NAME}")


def encode(text: str) -> np.ndarray:
    """
    Encode a text string into a 384-dimensional embedding vector.

    Args:
        text: Any string (complaint description, title, etc.)

    Returns:
        numpy array of shape (384,) — a dense float32 vector

    The returned vector can be:
        - Stored in ChromaDB for future similarity lookups
        - Compared to other vectors using cosine_similarity()
    """
    if _encoder is None:
        raise RuntimeError("Embedding model not loaded. Call load_model() first.")

    embedding = _encoder.encode(text, convert_to_numpy=True)
    return embedding.astype(np.float32)


def encode_batch(texts: list[str]) -> np.ndarray:
    """
    Encode a list of texts into embeddings in one batch.
    More efficient than calling encode() multiple times.

    Returns:
        numpy array of shape (len(texts), 384)
    """
    if _encoder is None:
        raise RuntimeError("Embedding model not loaded. Call load_model() first.")

    embeddings = _encoder.encode(texts, convert_to_numpy=True, batch_size=32)
    return embeddings.astype(np.float32)


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.

    Cosine similarity = dot(A, B) / (||A|| × ||B||)

    Returns a float in [-1, 1]:
        1.0 = identical direction (same meaning)
        0.0 = orthogonal (unrelated)
       -1.0 = opposite directions (rare in NLP)

    Interview note: We use cosine (angle between vectors) rather than
    Euclidean distance (spatial distance) because it's magnitude-invariant.
    A short complaint and a long complaint about the same topic will have
    the same cosine similarity as two complaints of equal length.
    """
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))
