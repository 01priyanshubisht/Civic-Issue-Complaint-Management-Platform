"""
similarity.py — Routes for semantic duplicate complaint detection.

Endpoints:
    POST /similarity/check  → Check if a new complaint is a duplicate
    POST /similarity/add    → Index a confirmed new complaint into ChromaDB

Architecture note:
    These routes are thin controllers. Business logic lives in:
        - duplicate_detection_service.py  → Orchestration layer
        - chroma_service.py               → ChromaDB storage operations
        - embedding_service.py            → Sentence-transformer encoding
"""

from fastapi import APIRouter, HTTPException
from app.schemas.similarity_schema import (
    SimilarityCheckRequest,
    SimilarityCheckResponse,
    SimilarityAddRequest,
    SimilarityAddResponse,
)
from app.services import duplicate_detection_service

router = APIRouter(prefix="/similarity", tags=["Duplicate Detection"])


@router.post("/check", response_model=SimilarityCheckResponse)
async def check_similarity(body: SimilarityCheckRequest):
    """
    Check if a new complaint is a semantic duplicate of any nearby complaint.

    Flow:
        1. Express backend geo-queries Supabase for complaints within ~50m radius
        2. Passes the nearby complaint IDs + new complaint text here
        3. We embed the new text and search ChromaDB within the candidate set
        4. Return: is_duplicate, duplicate_of (if found), similarity_score, action

    action:
        "merge"      → increment report_count on the existing complaint
        "create_new" → save as a brand new complaint

    Example request:
        {
            "complaint_id": "temp-uuid-123",
            "text": "Huge pothole near MG Road bus stop",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "nearby_complaints": [
                {"id": "abc-123", "text": "Big hole on MG Road"},
                {"id": "def-456", "text": "Waterlogging near the park"}
            ]
        }

    Example response (duplicate found):
        {
            "is_duplicate": true,
            "duplicate_of": "abc-123",
            "similarity_score": 0.891,
            "action": "merge"
        }
    """
    try:
        nearby_ids = [c.id for c in body.nearby_complaints]

        result = duplicate_detection_service.check_duplicate(
            new_text=body.text,
            nearby_complaint_ids=nearby_ids,
        )

        return SimilarityCheckResponse(**result)

    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Duplicate check failed: {str(e)}")


@router.post("/add", response_model=SimilarityAddResponse)
async def add_to_index(body: SimilarityAddRequest):
    """
    Index a confirmed new complaint's embedding into ChromaDB.

    Called AFTER a complaint is confirmed as non-duplicate and saved to Supabase.
    This makes the complaint retrievable for future duplicate checks.

    The complaint_id must be the final Supabase UUID (not a temp ID).
    """
    try:
        duplicate_detection_service.index_complaint(
            complaint_id=body.complaint_id,
            text=body.text,
        )
        return SimilarityAddResponse(
            success=True,
            complaint_id=body.complaint_id,
            message="Complaint embedding indexed in ChromaDB successfully.",
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index complaint: {str(e)}")
