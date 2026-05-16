"""
summarize_schema.py — Pydantic models for the Gemini summarization endpoint.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ─── Request Model ────────────────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    """
    Input to the Gemini summarization endpoint.
    All fields are used to build a structured prompt — NOT a chat conversation.
    """
    title: str = Field(..., example="Large pothole near school")
    description: str = Field(
        ...,
        example="There is a huge pothole on MG Road near City School. "
                "It has been there for 2 weeks and caused 2 accidents.",
    )
    category: str = Field(..., example="pothole")
    location: Optional[str] = Field(
        None,
        description="Human-readable location string (optional).",
        example="MG Road, Bengaluru",
    )


# ─── Response Model ───────────────────────────────────────────────────────────

class SummarizeResponse(BaseModel):
    """
    Gemini's response, parsed and validated.

    Interview note: We ask Gemini to respond in JSON format so we can
    programmatically extract the summary and routing fields.
    This is NOT a chatbot — it's a structured inference call.
    """
    summary: str = Field(
        ...,
        example="A dangerous pothole on MG Road near City School has caused "
                "accidents and requires urgent repair.",
    )
    routing_suggestion: Optional[str] = Field(
        None,
        example="Public Works Department — Roads & Infrastructure Division",
    )
    source: str = Field(
        default="gemini",
        description="'gemini' if Gemini API was used, 'fallback' if not configured.",
        example="gemini",
    )
