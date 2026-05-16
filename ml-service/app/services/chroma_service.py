"""
chroma_service.py — ChromaDB vector store for complaint embeddings.

Purpose:
    Persist and retrieve complaint embeddings for semantic duplicate detection.
    This is the STORAGE LAYER of the duplicate detection pipeline.

    chroma_service.py  ←→  ChromaDB (on-disk vector store)
         ↑
    duplicate_detection_service.py (orchestration)
         ↑
    FastAPI /similarity/check endpoint

Architecture:
    ChromaDB stores:
        - complaint_id  → Supabase UUID (used as ChromaDB document ID)
        - embedding     → 384-dim float32 vector (from sentence-transformers)
        - metadata      → {"text": "...", "lat": ..., "lng": ...}

    ChromaDB uses HNSW indexing (Hierarchical Navigable Small World) for
    Approximate Nearest Neighbor search. This scales to millions of vectors
    without linear search time.

Interview explanation:
    "ChromaDB is an embedded vector database — no separate server needed.
     It persists data to disk and uses HNSW for sub-linear ANN search.
     We configured it with cosine space so distances are 1 - cosine_similarity.
     The key optimization: Express geo-filters to nearby_complaints FIRST
     (cheap SQL range query), THEN we do semantic search ONLY on that small set.
     This makes duplicate detection O(nearby) not O(all_complaints)."
"""

import numpy as np
import chromadb
from app.config import settings

# ─── ChromaDB Singleton ───────────────────────────────────────────────────────
_client = None
_collection = None


def init_chromadb() -> None:
    """
    Initialize ChromaDB with persistent on-disk storage.
    Called once during FastAPI startup.

    PersistentClient saves all data to disk — embeddings survive server restarts.
    Data location: civicai/ml-service/chroma_db/
    """
    global _client, _collection

    _client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)

    # get_or_create_collection is idempotent — safe to call on every startup.
    # hnsw:space = "cosine" → distances are (1 - cosine_similarity)
    # ChromaDB minimizes distance, so most similar = smallest distance value.
    _collection = _client.get_or_create_collection(
        name=settings.CHROMA_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )

    print(
        f"  ✅ ChromaDB initialized | "
        f"Collection: '{settings.CHROMA_COLLECTION}' | "
        f"Stored embeddings: {_collection.count()}"
    )


def query_similar(
    query_embedding: np.ndarray,
    candidate_ids: list[str],
    n_results: int = 5,
) -> list[dict]:
    """
    Find the most semantically similar complaints from a candidate set.

    Args:
        query_embedding:  384-dim embedding of the new complaint.
        candidate_ids:    Complaint IDs to search within (geo-pre-filtered).
        n_results:        Maximum number of results to return.

    Returns:
        List of {"id": str, "similarity": float} sorted by similarity (highest first).
        Returns an empty list if no candidates exist in ChromaDB yet.

    How it works:
        ChromaDB queries using ANN search, filtered to candidate_ids.
        Returns (distance, id) pairs. We convert distance → similarity:
            similarity = 1.0 - distance  (for cosine space)
    """
    if _collection is None:
        raise RuntimeError("ChromaDB not initialized. Call init_chromadb() first.")

    if not candidate_ids:
        return []

    # Filter query to only the candidate IDs (geo-pre-filtered set)
    # Build ChromaDB where-filter for ID matching
    if len(candidate_ids) == 1:
        where_filter = {"complaint_id": {"$eq": candidate_ids[0]}}
    else:
        where_filter = {"$or": [{"complaint_id": {"$eq": cid}} for cid in candidate_ids]}

    # Cap n_results at the number of candidates
    n = min(n_results, len(candidate_ids))

    try:
        results = _collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=n,
            where=where_filter,
            include=["distances"],
        )
    except Exception as e:
        # ChromaDB raises if IDs don't exist — return empty rather than crashing
        print(f"  ⚠️  ChromaDB query error: {e}")
        return []

    distances = results["distances"][0]
    result_ids = results["ids"][0]

    if not distances:
        return []

    # Convert distances → similarities and sort by similarity (descending)
    matches = [
        {"id": rid, "similarity": round(1.0 - dist, 4)}
        for rid, dist in zip(result_ids, distances)
    ]
    matches.sort(key=lambda x: x["similarity"], reverse=True)
    return matches


def upsert_complaint(
    complaint_id: str,
    embedding: np.ndarray,
    text: str,
    lat: float = None,
    lng: float = None,
) -> None:
    """
    Add or update a complaint embedding in ChromaDB.

    Args:
        complaint_id: The Supabase UUID of the complaint (used as ChromaDB doc ID).
        embedding:    384-dim numpy array from embedding_service.encode().
        text:         Complaint description (stored as metadata for debugging).
        lat, lng:     Optional coordinates stored in metadata.

    Called AFTER a complaint is confirmed as non-duplicate and saved to Supabase.
    upsert: updates if complaint_id already exists, inserts if it doesn't.
    """
    if _collection is None:
        raise RuntimeError("ChromaDB not initialized. Call init_chromadb() first.")

    metadata = {
        "complaint_id": complaint_id,
        "text": text[:500],  # Truncate long descriptions for metadata storage
    }
    if lat is not None:
        metadata["lat"] = lat
    if lng is not None:
        metadata["lng"] = lng

    _collection.upsert(
        ids=[complaint_id],
        embeddings=[embedding.tolist()],
        metadatas=[metadata],
    )


def get_stored_ids(ids: list[str]) -> list[str]:
    """
    Return only the IDs from the given list that actually exist in ChromaDB.

    Used to filter candidate_ids before querying — avoids querying for
    IDs that were never indexed (e.g., old complaints created before
    the ChromaDB store was initialized).
    """
    if _collection is None or not ids:
        return []
    try:
        result = _collection.get(ids=ids)
        return result["ids"]
    except Exception:
        return []


def count() -> int:
    """Return the total number of embeddings stored in ChromaDB."""
    if _collection is None:
        return 0
    return _collection.count()
