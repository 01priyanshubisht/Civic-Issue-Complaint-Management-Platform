"""
predict.py — Routes for category prediction (text, image, multimodal).

Endpoints:
    POST /predict/text      → TF-IDF + Logistic Regression text classification
    POST /predict/image     → Roboflow hosted image classification
    POST /predict/combined  → Multimodal fusion (image + text → final category)

Architecture note:
    These routes are thin controllers. Business logic lives in the service layer:
        - text_service.py      → TF-IDF + LogReg inference
        - roboflow_service.py  → Roboflow API inference
        - fusion_service.py    → Confidence-based multimodal fusion
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.schemas.predict_schema import (
    TextPredictRequest,
    TextPredictResponse,
    ImagePredictResponse,
    CombinedPredictResponse,
    TextOnlyPredictResponse,
)
from app.services import text_service, roboflow_service, fusion_service

router = APIRouter(prefix="/predict", tags=["Prediction"])


# ─── Text Prediction ──────────────────────────────────────────────────────────

@router.post("/text", response_model=TextPredictResponse)
async def predict_text(body: TextPredictRequest):
    """
    Predict complaint category from text using TF-IDF + Logistic Regression.

    Example request:
        POST /predict/text
        {"text": "There is a massive pothole on MG Road near the bus stop."}

    Example response:
        {"category": "pothole", "confidence": 0.87, "all_scores": {...}, "source": "tfidf_logreg"}
    """
    try:
        result = text_service.predict(body.text)
        return TextPredictResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text prediction failed: {str(e)}")


# ─── Image Prediction ─────────────────────────────────────────────────────────

@router.post("/image", response_model=ImagePredictResponse)
async def predict_image(file: UploadFile = File(...)):
    """
    Predict complaint category from an uploaded image using Roboflow hosted inference.

    Accepts: multipart/form-data with an image file.

    Example response:
        {"category": "pothole", "confidence": 0.92, "source": "roboflow"}
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Expected an image file, got: {file.content_type}",
        )

    try:
        image_bytes = await file.read()
        result = roboflow_service.predict(image_bytes)
        return ImagePredictResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image prediction failed: {str(e)}")


# ─── Combined (Multimodal) Prediction ─────────────────────────────────────────

@router.post("/combined")
async def predict_combined(
    text: str = Form(...),
    file: UploadFile = File(None),  # Image is optional
):
    """
    Multimodal prediction: fuse Roboflow image + TF-IDF text predictions.

    Fusion strategy: Adaptive confidence-based weighting (fusion_service.py)
        - If image confidence ≥ 0.70 → image weight: 60%, text weight: 40%
        - If image confidence < 0.70 → image weight: 20%, text weight: 80%
        - If no image provided → text-only mode (text weight: 100%)

    This is LATE FUSION — each modality predicts independently,
    and we combine at the decision level. This is more interpretable
    than early fusion (concatenating features before classification).

    Example response:
        {
            "final_category": "pothole",
            "final_confidence": 0.872,
            "image_result": {"category": "pothole", "confidence": 0.91, "source": "roboflow"},
            "text_result":  {"category": "pothole", "confidence": 0.78, "source": "tfidf_logreg"},
            "models_agree": true,
            "fusion_method": "adaptive_fusion_image_confident_agreed",
            "weights_used":  {"image": 0.6, "text": 0.4}
        }
    """
    # ── Text prediction (always runs) ──────────────────────────────────────────
    try:
        text_result = text_service.predict(text)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"Text classifier not ready: {e}")

    # ── Image prediction (only if image provided) ──────────────────────────────
    image_result = None
    if file is not None and file.content_type and file.content_type.startswith("image/"):
        try:
            image_bytes = await file.read()
            image_result = roboflow_service.predict(image_bytes)
        except Exception:
            # Image prediction failed → fall back to text-only
            image_result = None

    # ── Fusion ─────────────────────────────────────────────────────────────────
    if image_result is None:
        fused = fusion_service.text_only(text_result)
        return TextOnlyPredictResponse(
            final_category=fused["final_category"],
            final_confidence=fused["final_confidence"],
            text_result=TextPredictResponse(**text_result),
            fusion_method=fused["fusion_method"],
            models_agree=fused["models_agree"],
        )

    fused = fusion_service.fuse(image_result, text_result)
    return CombinedPredictResponse(
        final_category=fused["final_category"],
        final_confidence=fused["final_confidence"],
        image_result=ImagePredictResponse(**image_result),
        text_result=TextPredictResponse(**text_result),
        models_agree=fused["models_agree"],
        fusion_method=fused["fusion_method"],
        weights_used=fused["weights_used"],
    )
