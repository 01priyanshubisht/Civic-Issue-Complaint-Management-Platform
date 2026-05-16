"""
predict_schema.py — Pydantic models for prediction endpoints.

Pydantic provides automatic type validation, serialization, and
OpenAPI schema generation at zero extra cost.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ─── Request Models ───────────────────────────────────────────────────────────

class TextPredictRequest(BaseModel):
    """Input for text-based category prediction."""
    text: str = Field(
        ...,
        min_length=5,
        description="The complaint description text to classify.",
        example="There is a massive pothole on MG Road near the bus stop.",
    )


# ─── Response Models ──────────────────────────────────────────────────────────

class ImagePredictResponse(BaseModel):
    """Output from Roboflow image classification."""
    category: str = Field(..., example="pothole")
    confidence: float = Field(..., ge=0.0, le=1.0, example=0.91)
    source: str = Field(default="roboflow", example="roboflow")


class TextPredictResponse(BaseModel):
    """Output from TF-IDF + Logistic Regression text classification."""
    category: str = Field(..., example="pothole")
    confidence: float = Field(..., ge=0.0, le=1.0, example=0.78)
    # All class probabilities — useful for debugging and interview demos
    all_scores: dict[str, float] = Field(
        ...,
        example={
            "pothole": 0.78,
            "garbage": 0.08,
            "waterlogging": 0.05,
            "broken_streetlight": 0.05,
            "road_damage": 0.04,
        },
    )
    source: str = Field(default="tfidf_logreg", example="tfidf_logreg")


class CombinedPredictResponse(BaseModel):
    """
    Output from the multimodal fusion pipeline.

    fusion_method describes which fusion path was taken:
        "adaptive_fusion_image_confident_agreed"       → both models agreed, image was confident
        "adaptive_fusion_image_confident_disagreed_winner_picked" → image confident, models disagreed
        "adaptive_fusion_text_dominant_agreed"         → image low-confidence, models agreed
        "adaptive_fusion_text_dominant_disagreed_winner_picked" → text dominated, models disagreed
    """
    final_category: str = Field(..., example="pothole")
    final_confidence: float = Field(..., ge=0.0, le=1.0, example=0.872)
    image_result: ImagePredictResponse
    text_result: TextPredictResponse
    models_agree: bool = Field(..., description="Whether Roboflow and text model agreed.")
    fusion_method: str = Field(..., description="Which fusion path was taken.")
    weights_used: dict[str, float] = Field(
        ...,
        description="Actual weights applied during fusion.",
        example={"image": 0.6, "text": 0.4},
    )


class TextOnlyPredictResponse(BaseModel):
    """Used when no image is provided — text-only prediction."""
    final_category: str
    final_confidence: float
    text_result: TextPredictResponse
    fusion_method: str = Field(default="text_only")
    models_agree: bool = Field(default=True)
