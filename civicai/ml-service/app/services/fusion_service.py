"""
fusion_service.py — Multimodal prediction fusion logic.

Purpose:
    Combine image prediction (Roboflow) and text prediction (TF-IDF + LogReg)
    into a single final category using confidence-based weighted fusion.

Architecture Role:
    This is the CUSTOM AI ENGINEERING layer of the system.
    Using a pretrained Roboflow model alone would be "just an API call."
    The fusion logic is what makes this an AI PIPELINE.

    Image Prediction ─────┐
                          ├──→ Fusion Logic ──→ Final Category
    Text Prediction  ─────┘

Fusion Strategy: Adaptive Confidence Weighting
    The weights are NOT fixed. They adapt based on image confidence:
        - If image confidence is HIGH (≥ 0.70): trust image more (60/40 split)
        - If image confidence is LOW  (< 0.70): trust text more (20/80 split)
    This reflects the real-world truth that blurry or ambiguous images
    should yield to the more reliable text description.

Interview explanation:
    "This is late-fusion multimodal classification. Each modality produces
     independent predictions, which we combine at the decision level using
     adaptive confidence weighting. Early fusion (concatenating features)
     would require joint training — late fusion lets us swap out either
     model independently. The adaptive weights reflect a practical insight:
     image models are less reliable on low-quality uploads, so we downweight
     them dynamically."
"""

from app.config import settings


def fuse(image_result: dict, text_result: dict) -> dict:
    """
    Fuse image and text predictions into a final category prediction.

    Args:
        image_result: Output from roboflow_service.predict()
            {"category": str, "confidence": float, "source": str}
        text_result: Output from text_service.predict()
            {"category": str, "confidence": float, "all_scores": dict, "source": str}

    Returns:
        {
            "final_category": str,
            "final_confidence": float,
            "image_result": dict,
            "text_result": dict,
            "models_agree": bool,
            "fusion_method": str,   # Explains which path was taken
            "weights_used": dict,   # {"image": float, "text": float}
        }

    Fusion Logic:
        Step 1: Determine adaptive weights based on image confidence.
                High image confidence → image gets more weight.
                Low image confidence  → text gets more weight.

        Step 2: Compute weighted confidence for each modality's category.

        Step 3: If both models agree on the same category → high confidence.
                If they disagree → pick the category with higher weighted score.
    """
    img_category = image_result["category"]
    img_confidence = image_result["confidence"]

    text_category = text_result["category"]
    text_confidence = text_result["confidence"]

    # ── Step 1: Adaptive Weight Selection ────────────────────────────────────
    # If the image model is confident, trust it more.
    # If the image is unclear, the text description is more reliable.
    if img_confidence >= settings.IMAGE_CONFIDENCE_THRESHOLD:
        img_weight = settings.HIGH_IMAGE_WEIGHT     # e.g., 0.60
        text_weight = settings.HIGH_TEXT_WEIGHT     # e.g., 0.40
        fusion_method = "adaptive_fusion_image_confident"
    else:
        img_weight = settings.LOW_IMAGE_WEIGHT      # e.g., 0.20
        text_weight = settings.LOW_TEXT_WEIGHT      # e.g., 0.80
        fusion_method = "adaptive_fusion_text_dominant"

    weights_used = {"image": img_weight, "text": text_weight}

    # ── Step 2: Check if both models agree ───────────────────────────────────
    models_agree = img_category == text_category

    if models_agree:
        # Both modalities agree → combine their confidences
        final_category = img_category
        final_confidence = (img_weight * img_confidence) + (text_weight * text_confidence)
        fusion_method += "_agreed"
    else:
        # Disagreement → pick the category backed by higher weighted confidence
        img_weighted = img_weight * img_confidence
        text_weighted = text_weight * text_confidence

        if img_weighted >= text_weighted:
            final_category = img_category
            final_confidence = img_weighted
        else:
            final_category = text_category
            final_confidence = text_weighted
        fusion_method += "_disagreed_winner_picked"

    return {
        "final_category": final_category,
        "final_confidence": round(final_confidence, 4),
        "image_result": image_result,
        "text_result": text_result,
        "models_agree": models_agree,
        "fusion_method": fusion_method,
        "weights_used": weights_used,
    }


def text_only(text_result: dict) -> dict:
    """
    Build a fusion-compatible response using only text prediction.
    Used when no image is provided or image classification failed.

    Args:
        text_result: Output from text_service.predict()

    Returns:
        Same structure as fuse(), with fusion_method = "text_only"
    """
    return {
        "final_category": text_result["category"],
        "final_confidence": round(text_result["confidence"], 4),
        "image_result": None,
        "text_result": text_result,
        "models_agree": True,
        "fusion_method": "text_only",
        "weights_used": {"image": 0.0, "text": 1.0},
    }
