"""
similarity_schema.py — Pydantic models for duplicate detection endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ─── Shared Sub-models ────────────────────────────────────────────────────────

class NearbyComplaint(BaseModel):
    """
    A nearby complaint pre-filtered by the Express backend using a bounding-box
    geo query. Only complaints within ~50m radius are passed here.

    Interview note: We do geo-filtering in the database (cheap) BEFORE
    semantic similarity (expensive). This is the key optimization.
    """
    id: str = Field(..., description="UUID of the complaint in Supabase.")
    text: str = Field(..., description="The description text of the nearby complaint.")


# ─── Request Models ───────────────────────────────────────────────────────────

class SimilarityCheckRequest(BaseModel):
    """
    Input to the duplicate detection endpoint.

    Flow:
        1. Express geo-queries Supabase → gets nearby complaint IDs
        2. Passes them here with the new complaint's text
        3. We embed the new text + query ChromaDB filtered to those IDs
        4. Return whether it's a duplicate
    """
    complaint_id: str = Field(
        ...,
        description="A temporary ID for the new complaint (can be a UUID generated client-side).",
    )
    text: str = Field(..., description="The new complaint's description text.")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    nearby_complaints: list[NearbyComplaint] = Field(
        default=[],
        description="Complaints within geo radius, pre-fetched by Express.",
    )


class SimilarityAddRequest(BaseModel):
    """Add a confirmed new complaint's embedding to ChromaDB."""
    complaint_id: str = Field(..., description="The final Supabase UUID of the complaint.")
    text: str = Field(..., description="The complaint description to embed and store.")


# ─── Response Models ──────────────────────────────────────────────────────────

class SimilarityCheckResponse(BaseModel):
    """
    Result of duplicate detection.

    action:
        "merge"      → is_duplicate=True, Express should increment report_count
        "create_new" → is_duplicate=False, Express should create a new complaint
    """
    is_duplicate: bool
    duplicate_of: Optional[str] = Field(
        None,
        description="ID of the existing complaint this is a duplicate of.",
    )
    similarity_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Highest cosine similarity score found.",
    )
    action: str = Field(..., description="'merge' or 'create_new'")


class SimilarityAddResponse(BaseModel):
    """Confirmation that embedding was stored."""
    success: bool
    complaint_id: str
    message: str
