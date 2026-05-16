"""
summarize.py — Route for Gemini API complaint summarization.

Endpoint:
    POST /summarize/  → Generate a 1-2 sentence summary + routing suggestion

Architecture note:
    This is STRUCTURED INFERENCE, not a chatbot.
    Fixed input → fixed prompt → structured JSON output.
    Business logic lives in gemini_service.py.
"""

from fastapi import APIRouter, HTTPException
from app.schemas.summarize_schema import SummarizeRequest, SummarizeResponse
from app.services import gemini_service

router = APIRouter(prefix="/summarize", tags=["Summarization"])


@router.post("", response_model=SummarizeResponse)
async def summarize_complaint(body: SummarizeRequest):
    """
    Generate a concise 1-2 line summary and department routing suggestion.

    Uses Gemini 1.5 Flash with a structured, deterministic prompt.
    Falls back to a template-based summary if the API key is not configured.

    This is NOT a chatbot. It accepts structured complaint data and
    returns structured JSON. Same input → consistent, predictable output.

    Example request:
        {
            "title": "Broken streetlight on 4th Main",
            "description": "The streetlight near the school has been out for 5 days.",
            "category": "broken_streetlight",
            "location": "4th Main, Indiranagar, Bengaluru"
        }

    Example response:
        {
            "summary": "A streetlight on 4th Main near a school has been non-functional for 5 days.",
            "routing_suggestion": "Electrical Department — Street Lighting Division",
            "source": "gemini"
        }
    """
    try:
        result = gemini_service.summarize(
            title=body.title,
            description=body.description,
            category=body.category,
            location=body.location,
        )
        return SummarizeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")
