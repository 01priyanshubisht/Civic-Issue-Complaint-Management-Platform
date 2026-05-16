"""
gemini_service.py — Gemini API complaint summarization.

Purpose:
    Generate a concise 1-2 sentence summary of a civic complaint, and
    suggest which municipal department should handle it.

    This is STRUCTURED INFERENCE, not a chatbot.
    Input → Fixed Prompt Template → Structured JSON Output

Architecture role:
    This is the "last mile" feature of the AI pipeline. After a complaint
    is classified (category) and deduplicated, we generate a short summary
    that city officers can read at a glance — saving them time.

Interview explanation:
    "We use Gemini Flash as a structured inference engine, not a conversational
     agent. The prompt is deterministic — same input always produces similar
     output. We ask Gemini to respond strictly in JSON format so we can
     programmatically extract the fields. We also have a fallback summary
     generator for when the Gemini API is unavailable, so the entire complaint
     pipeline works without the external API dependency."
"""

import json
import re
from app.config import settings

# ─── Singleton ────────────────────────────────────────────────────────────────
_model = None
_client = None


def init_gemini() -> None:
    """
    Initialize the Gemini API client.
    Called once during FastAPI startup.
    Skipped gracefully if GEMINI_API_KEY is not set.
    """
    global _model

    if not settings.GEMINI_API_KEY:
        print("  ⚠️  GEMINI_API_KEY not set. Summarization will use fallback mode.")
        print("  → Get your key at: https://aistudio.google.com/")
        return

    try:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        # Store client globally; use gemini-1.5-flash model
        
        global _client
        _client = client
        _model = "gemini-2.5-flash"
        print("  ✅ Gemini API initialized (gemini-2.5-flash)")
    except Exception as e:
        print(f"  ⚠️  Gemini initialization failed: {e}. Will use fallback summaries.")
        _model = None


# ─── Prompt Template ──────────────────────────────────────────────────────────
# A fixed, structured prompt. This is NOT conversational.
# We tell Gemini exactly what format to respond in (JSON).
_PROMPT_TEMPLATE = """You are a municipal complaint processing assistant.

Complaint Details:
- Title: {title}
- Category: {category}
- Description: {description}
- Location: {location}

Task:
1. Write a 1-2 sentence summary of this complaint for a city officer. Be concise and factual.
2. Suggest which municipal department should handle this complaint.

Respond ONLY in this exact JSON format (no markdown, no extra text):
{{"summary": "your summary here", "routing_suggestion": "department name here"}}"""


def summarize(title: str, description: str, category: str, location: str = None) -> dict:
    """
    Generate a concise summary and routing suggestion for a complaint.

    Args:
        title:       Complaint title
        description: Full complaint description
        category:    Predicted category label (e.g., "pothole")
        location:    Optional human-readable location string

    Returns:
        {
            "summary": str,                    # 1-2 sentence summary
            "routing_suggestion": str | None,  # Department to route to
            "source": str,                     # "gemini" or "fallback"
        }

    If Gemini is unavailable, returns a deterministic fallback so the
    complaint pipeline continues to function without the external API.
    """
    if _model is None:
        return _fallback_summary(title, description, category)

    prompt = _PROMPT_TEMPLATE.format(
        title=title,
        description=description[:1000],  # Truncate very long descriptions
        category=category.replace("_", " ").title(),
        location=location or "Not specified",
    )

    try:
        response = _client.models.generate_content(
            model=_model,
            contents=prompt,
        )
        raw_text = response.text.strip()

        # Extract JSON from response
        # Gemini sometimes wraps its output in markdown code blocks — handle that.
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return {
                "summary": result.get("summary", ""),
                "routing_suggestion": result.get("routing_suggestion"),
                "source": "gemini",
            }
        else:
            return _fallback_summary(title, description, category)

    except Exception as e:
        print(f"  Gemini API error: {e}. Using fallback summary.")
        return _fallback_summary(title, description, category)


def is_ready() -> bool:
    """Check if Gemini API is configured and ready."""
    return _model is not None


# ─── Fallback Routing Map ─────────────────────────────────────────────────────
# Deterministic department routing for when Gemini is unavailable.
# Keeps the pipeline functional without external API dependency.
_ROUTING_MAP = {
    "pothole":             "Public Works Department — Roads & Infrastructure",
    "garbage":             "Solid Waste Management Department",
    "waterlogging":        "Storm Water Drain Division",
    "broken_streetlight":  "Electrical Department — Street Lighting Division",
    "road_damage":         "Public Works Department — Road Maintenance",
    "others":              "Municipal Corporation — General Services",
}


def _fallback_summary(title: str, description: str, category: str) -> dict:
    """Generate a basic summary without the Gemini API."""
    routing = _ROUTING_MAP.get(category, "Municipal Corporation — General Services")
    summary = f"{title}. {description[:150].rstrip('.')}."
    return {
        "summary": summary,
        "routing_suggestion": routing,
        "source": "fallback",
    }
