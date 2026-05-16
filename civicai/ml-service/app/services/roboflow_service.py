"""
roboflow_service.py — Roboflow Hosted Workflow Inference for civic image classification.

Architecture Role:
    This is ONE component inside the larger AI orchestration pipeline.
    It handles ONLY image-to-category inference via Roboflow's hosted workflow API.

    The broader system also includes:
        - TF-IDF + LogReg text classification (text_service.py)
        - Confidence-based multimodal fusion (fusion_service.py)
        - Semantic duplicate detection (duplicate_detection_service.py)
        - Gemini summarization (gemini_service.py)

    Roboflow is used here as a hosted computer vision inference provider.
    We call a hosted workflow — no local model weights, no GPU needed.

Interview explanation:
    "We use Roboflow's hosted workflow inference via the inference-sdk.
     This is a deliberate engineering decision: we get a production-ready
     CV model without the complexity of training our own CNN.
     The Roboflow prediction is ONE input to our multimodal fusion layer,
     which also consumes a TF-IDF text prediction. The intelligence of the
     system lies in the orchestration and adaptive fusion logic, not in
     re-training a model that already exists."

Workflow inference flow:
    image bytes → temp file → InferenceHTTPClient.run_workflow() → parse → normalize → return

Supported civic categories:
    pothole | garbage | broken_streetlight | road_damage | others
"""

import tempfile
import os
import time
from app.config import settings

# ─── State ────────────────────────────────────────────────────────────────────
# Lazy-initialised client — created once at startup, reused for every request.
_client = None
_roboflow_ready = False

# Timeout for hosted workflow inference (seconds)
# Roboflow serverless typically responds in 1-3s; 10s is a safe upper bound
ROBOFLOW_TIMEOUT = 10.0


def init_roboflow() -> None:
    """
    Validate Roboflow configuration and initialise the InferenceHTTPClient.

    Called once during FastAPI startup (lifespan event).
    No model download happens here — inference runs remotely on Roboflow's servers.
    """
    global _client, _roboflow_ready

    missing = []
    if not settings.ROBOFLOW_API_KEY:
        missing.append("ROBOFLOW_API_KEY")
    if not settings.ROBOFLOW_WORKSPACE:
        missing.append("ROBOFLOW_WORKSPACE")
    if not settings.ROBOFLOW_WORKFLOW_ID:
        missing.append("ROBOFLOW_WORKFLOW_ID")

    if missing:
        print(f"  ⚠️  Missing Roboflow config: {', '.join(missing)}")
        print("  → Image classification will run in fallback mode.")
        print("  → Set these variables in ml-service/.env")
        _roboflow_ready = False
        return

    try:
        from inference_sdk import InferenceHTTPClient

        _client = InferenceHTTPClient(
            api_url="https://serverless.roboflow.com",
            api_key=settings.ROBOFLOW_API_KEY,
        )
        _roboflow_ready = True
        print(
            f"  ✅ Roboflow ready | "
            f"workspace: {settings.ROBOFLOW_WORKSPACE} | "
            f"workflow: {settings.ROBOFLOW_WORKFLOW_ID}"
        )

    except ImportError:
        print("  ⚠️  inference-sdk not installed. Run: pip install inference-sdk")
        print("  → Image classification will run in fallback mode.")
        _roboflow_ready = False
    except Exception as e:
        print(f"  ⚠️  Roboflow init error: {e}")
        _roboflow_ready = False


def predict(image_bytes: bytes) -> dict:
    """
    Classify a complaint image using Roboflow Hosted Workflow Inference.

    Args:
        image_bytes: Raw image bytes (JPEG, PNG, WebP, etc.)

    Returns:
        {
            "category":   str,    # e.g. "pothole"
            "confidence": float,  # 0.0 – 1.0
            "source":     str,    # "roboflow" or "fallback"
        }

    Flow:
        1. Write image bytes to a temporary file (inference-sdk expects a file path)
        2. Call client.run_workflow() with workspace/workflow IDs and class hints
        3. Parse the workflow output — handle multiple possible response shapes
        4. Normalize the category label to our canonical set
        5. Clean up the temp file

    Production Considerations:
        - Timeout: 10s maximum for serverless hosted inference.
        - Graceful degradation: if Roboflow fails, returns low-confidence fallback
          so the text model (TF-IDF + LogReg) dominates the final decision.
    """
    if not _roboflow_ready or _client is None:
        return _gemini_vision_fallback(image_bytes, reason="not ready or no client")

    # Use base64 encoding for the image to avoid temp file and NumPy issues
    import base64
    start_time = time.time()

    try:
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")

        # Call hosted workflow
        try:
            result = _client.run_workflow(
                workspace_name=settings.ROBOFLOW_WORKSPACE,
                workflow_id=settings.ROBOFLOW_WORKFLOW_ID,
                images={"image": encoded_image},
                use_cache=True,
            )
            # Handle empty results from SDK
            if not result or (isinstance(result, list) and not result[0]):
                raise ValueError("Empty result from SDK")
        except Exception as sdk_err:
            # If SDK fails (e.g. NumPy error or empty result), try direct REST call
            import requests
            
            api_url = f"https://serverless.roboflow.com/{settings.ROBOFLOW_WORKSPACE}/workflows/{settings.ROBOFLOW_WORKFLOW_ID}"
            response = requests.post(
                api_url,
                json={
                    "api_key": settings.ROBOFLOW_API_KEY,
                    "inputs": {
                        "image": encoded_image
                    }
                },
                timeout=ROBOFLOW_TIMEOUT
            )
            response.raise_for_status()
            result = response.json()

        elapsed = time.time() - start_time
        parsed = _parse_workflow_result(result)
        parsed["inference_time_ms"] = round(elapsed * 1000, 2)
        return parsed

    except Exception as e:
        elapsed = time.time() - start_time
        print(f"  ⚠️  Roboflow inference error (after {elapsed:.2f}s): {e}")
        return _gemini_vision_fallback(image_bytes, reason=f"exception: {e}")

    finally:
        pass # No temp file to clean up anymore


def is_ready() -> bool:
    """Check if Roboflow is properly configured and the client is initialised."""
    return _roboflow_ready


# ─── Response Parsing ─────────────────────────────────────────────────────────


def _parse_workflow_result(result) -> dict:
    """
    Parse the run_workflow() response into our standardized prediction dict.

    Handles various response shapes from both inference-sdk and direct REST calls.
    """
    if not result:
        print("  ⚠️  Empty Roboflow response. Using fallback.")
        return _gemini_vision_fallback(reason="empty result")

    # 1. Flatten: grab the first output block if it's a list (SDK style)
    output = result[0] if isinstance(result, list) else result

    # 2. Handle REST API "outputs" wrapper
    if isinstance(output, dict) and "outputs" in output and isinstance(output["outputs"], list):
        output = output["outputs"][0]

    # 3. Unwrap custom step names (e.g. {"model_output": {...}})
    # We look for a dictionary that contains classification keys
    if isinstance(output, dict) and "predictions" not in output and "top" not in output:
        for val in output.values():
            if isinstance(val, dict) and ("predictions" in val or "top" in val):
                output = val
                break

    # 4. Parse classification result
    # Shape A: Direct "top" and "confidence"
    if isinstance(output, dict):
        top = output.get("top")
        confidence = output.get("confidence")
        if top and confidence is not None:
            return {
                "category": _normalize_category(top),
                "confidence": round(float(confidence), 4),
                "source": "roboflow",
            }

        # Shape B: {"predictions": {"top": ..., "confidence": ...}}
        preds = output.get("predictions", {})
        if isinstance(preds, dict):
            top = preds.get("top")
            confidence = preds.get("confidence")
            if top and confidence is not None:
                return {
                    "category": _normalize_category(top),
                    "confidence": round(float(confidence), 4),
                    "source": "roboflow",
                }
            
            # Shape C: {"predictions": {"predictions": [...]}}
            nested = preds.get("predictions", [])
            if nested and isinstance(nested, list):
                return _parse_predictions_list(nested)

        # Shape D: {"predictions": [...]}
        if isinstance(preds, list) and preds:
            return _parse_predictions_list(preds)

    print(f"  ⚠️  Could not parse Roboflow response: {output}. Using fallback.")
    return _gemini_vision_fallback(reason="could not parse")


def _parse_predictions_list(predictions: list) -> dict:
    """
    Parse a list of prediction objects, pick the highest-confidence one.

    Each item is expected to have 'class' (or 'class_name') and 'confidence'.
    """
    if not predictions:
        return _gemini_vision_fallback(reason="empty predictions")

    # Sort descending by confidence and take the top result
    try:
        best = max(
            predictions,
            key=lambda p: float(p.get("confidence", 0.0)),
        )
        raw_class = best.get("class") or best.get("class_name", "others")
        confidence = float(best.get("confidence", 0.5))

        return {
            "category": _normalize_category(raw_class),
            "confidence": round(confidence, 4),
            "source": "roboflow",
        }
    except Exception as e:
        print(f"  ⚠️  Error parsing predictions list: {e}")
        return _gemini_vision_fallback(reason=f"parse list error: {e}")


# ─── Category Normalization ───────────────────────────────────────────────────

# Map any variant labels the workflow might return to our canonical category set.
_CATEGORY_ALIASES: dict[str, str] = {
    "pothole": "pothole",
    "pot_hole": "pothole",
    "garbage": "garbage",
    "trash": "garbage",
    "waste": "garbage",
    "litter": "garbage",
    "broken_streetlight": "broken_streetlight",
    "streetlight": "broken_streetlight",
    "street_light": "broken_streetlight",
    "broken_street_light": "broken_streetlight",
    "road_damage": "road_damage",
    "road damage": "road_damage",
    "road_crack": "road_damage",
    "waterlogging": "waterlogging",
    "flooding": "waterlogging",
    "flood": "waterlogging",
    "others": "others",
    "other": "others",
    "unknown": "others",
}


def _normalize_category(raw: str) -> str:
    """
    Normalize a raw Roboflow label to our canonical category set.
    Falls back to 'others' for any unrecognized label.
    """
    normalized = raw.lower().strip().replace(" ", "_")
    return _CATEGORY_ALIASES.get(normalized, "others")


# ─── Fallback ─────────────────────────────────────────────────────────────────


def _gemini_vision_fallback(image_bytes: bytes = None, reason="unknown") -> dict:
    """
    Attempt to use Gemini Vision for image classification if Roboflow fails.
    If Gemini fails, return the standard low-confidence fallback.
    """
    if image_bytes and hasattr(settings, "GEMINI_API_KEY") and settings.GEMINI_API_KEY:
        try:
            from google import genai
            from google.genai import types
            
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
            prompt = (
                "Analyze this image and classify it into exactly ONE of these categories: "
                "pothole, garbage, broken_streetlight, road_damage, others. "
                "Respond with ONLY the exact category name in lowercase without any punctuation."
            )
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
                    prompt
                ]
            )
            
            cat = response.text.strip().lower()
            valid_categories = {"pothole", "garbage", "broken_streetlight", "road_damage", "others"}
            
            if cat in valid_categories:
                print(f"  ✅  Gemini Vision successfully recovered classification: {cat}")
                return {
                    "category": cat,
                    "confidence": 0.85, # High enough to impact fusion
                    "source": "gemini_vision",
                    "debug_reason": "roboflow_failed_gemini_recovered",
                    "roboflow_error": reason
                }
        except Exception as e:
            print(f"  ⚠️  Gemini Vision fallback also failed: {e}")
            
    # Final fallback if Gemini also fails or no image bytes provided
    return {
        "category": "others",
        "confidence": 0.20,
        "source": "fallback",
        "debug_reason": reason,
        "is_ready": _roboflow_ready,
        "has_client": _client is not None
    }
