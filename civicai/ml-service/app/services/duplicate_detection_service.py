"""
duplicate_detection_service.py — Semantic duplicate complaint detection.

THIS IS THE MAIN AI FEATURE of the CivicAI platform.

Purpose:
    Prevent duplicate complaints by detecting semantically similar reports
    of the same civic issue. Two complaints are duplicates if they describe
    the same problem in the same geographic area — even if worded differently.

    Example:
        "Big pothole on MG Road near the bus stop"
        "Huge road hole at MG Road bus stop"
        → Same issue, different words → DUPLICATE (merge, don't create new)

Architecture:
    This is semantic retrieval + vector similarity search, NOT chatbot RAG.

    The pipeline has two stages:
        Stage 1 — GEO FILTER (done by Express backend before calling us):
            - SQL bounding-box query on Supabase
            - Narrows candidates to complaints within ~50m radius
            - This makes Stage 2 fast (small candidate set, not all complaints)

        Stage 2 — SEMANTIC SIMILARITY (done here):
            - Encode new complaint text → 384-dim embedding vector
            - Query ChromaDB for most similar embedding within candidate set
            - If cosine similarity ≥ threshold → DUPLICATE

    Why two stages?
        Geo filter: O(1) with DB index — cheap
        Embedding + vector search: O(nearby candidates) — affordable
        Without geo filter: O(all complaints) — expensive and unnecessary

Interview explanation:
    "We detect duplicates using sentence-transformers embeddings + ChromaDB
     vector search. Two complaints can be semantically identical even with
     different words. A pure keyword search (like TF-IDF) would miss this.
     We pre-filter by geography first to keep the semantic search fast — only
     complaints within 50m are checked. This is a retrieval-augmented matching
     system: we retrieve semantically similar complaints and decide whether to
     merge or create new based on similarity score."
"""

from app.services import embedding_service, chroma_service
from app.config import settings


def check_duplicate(new_text: str, nearby_complaint_ids: list[str]) -> dict:
    """
    Determine if a new complaint is a semantic duplicate of an existing nearby one.

    Args:
        new_text:               The new complaint's description text.
        nearby_complaint_ids:   Complaint IDs pre-filtered by geo radius.
                                Provided by Express backend from Supabase query.

    Returns:
        {
            "is_duplicate": bool,
            "duplicate_of": str | None,     # complaint_id of the matched duplicate
            "similarity_score": float | None,
            "action": "merge" | "create_new",
        }

    Flow:
        1. If no nearby complaints → definitely not a duplicate → "create_new"
        2. Filter candidate_ids to only those indexed in ChromaDB
           (new complaints won't be in ChromaDB yet)
        3. Encode new_text → embedding
        4. Query ChromaDB within the candidate set
        5. If best similarity ≥ SIMILARITY_THRESHOLD → "merge"
           Else → "create_new"
    """
    # ── Fast path: no nearby complaints ───────────────────────────────────────
    if not nearby_complaint_ids:
        return {
            "is_duplicate": False,
            "duplicate_of": None,
            "similarity_score": None,
            "action": "create_new",
        }

    # ── Filter to only indexed complaints ─────────────────────────────────────
    # ChromaDB only contains complaints that were previously confirmed and saved.
    # New complaints haven't been indexed yet.
    indexed_ids = chroma_service.get_stored_ids(nearby_complaint_ids)

    if not indexed_ids:
        return {
            "is_duplicate": False,
            "duplicate_of": None,
            "similarity_score": None,
            "action": "create_new",
        }

    # ── Encode the new complaint text → embedding ──────────────────────────────
    new_embedding = embedding_service.encode(new_text)

    # ── Query ChromaDB for the most similar complaint ──────────────────────────
    matches = chroma_service.query_similar(
        query_embedding=new_embedding,
        candidate_ids=indexed_ids,
    )

    if not matches:
        return {
            "is_duplicate": False,
            "duplicate_of": None,
            "similarity_score": None,
            "action": "create_new",
        }

    # Best match is the first (highest similarity) after sorting
    best = matches[0]
    best_id = best["id"]
    best_similarity = best["similarity"]

    is_duplicate = best_similarity >= settings.SIMILARITY_THRESHOLD

    return {
        "is_duplicate": is_duplicate,
        "duplicate_of": best_id if is_duplicate else None,
        "similarity_score": best_similarity,
        "action": "merge" if is_duplicate else "create_new",
    }


def index_complaint(complaint_id: str, text: str, lat: float = None, lng: float = None) -> None:
    """
    Index a confirmed new complaint into ChromaDB.

    Called AFTER the complaint is saved to Supabase (non-duplicate path only).
    This makes the complaint available for future duplicate checks.

    Args:
        complaint_id: The final Supabase UUID of the complaint.
        text:         The complaint description to embed and store.
        lat, lng:     Optional coordinates for metadata storage.
    """
    embedding = embedding_service.encode(text)
    chroma_service.upsert_complaint(
        complaint_id=complaint_id,
        embedding=embedding,
        text=text,
        lat=lat,
        lng=lng,
    )
