"""
text_service.py — TF-IDF + Logistic Regression text classification.

Purpose:
    Predict civic complaint category from complaint description text.
    This is a classic, lightweight NLP pipeline — fast, interpretable,
    and easy to explain in an interview.

Interview explanation:
    "TF-IDF transforms complaint text into a sparse feature vector where
     rare, specific words (like 'pothole', 'waterlogging') get higher weights.
     Logistic Regression then learns a linear decision boundary per class.
     The entire pipeline is saved as a .pkl file and loaded once at startup.
     Inference takes ~1ms per request — ideal for a production ML service."

Model file: app/models/text_classifier.pkl
Training script: app/training/train_text_classifier.py (run once to generate .pkl)
"""

import joblib
import numpy as np
from pathlib import Path
from app.config import settings

# ─── Singleton ────────────────────────────────────────────────────────────────
# The pipeline (TfidfVectorizer + LogisticRegression) is loaded ONCE at startup
# and reused for every request. This is the standard production ML serving pattern.
_pipeline = None


def load_model() -> None:
    """
    Load the trained TF-IDF + Logistic Regression pipeline from disk.
    Called once during FastAPI startup via the lifespan event.

    Raises:
        FileNotFoundError: if the .pkl file doesn't exist yet.
        Run `python app/training/train_text_classifier.py` to generate it.
    """
    global _pipeline
    model_path = Path(settings.TEXT_CLASSIFIER_PATH)

    if not model_path.exists():
        raise FileNotFoundError(
            f"Text classifier model not found at {model_path}. "
            "Run: python app/training/train_text_classifier.py"
        )

    _pipeline = joblib.load(model_path)
    print(f"  ✅ Text classifier loaded from {model_path}")


def predict(text: str) -> dict:
    """
    Predict the complaint category from a text description.

    Args:
        text: The complaint description string (e.g., "Big pothole on MG Road")

    Returns:
        {
            "category": str,          # Predicted category label
            "confidence": float,      # Probability of the predicted class (0.0-1.0)
            "all_scores": dict,       # Probability for every class
            "source": str,            # Always "tfidf_logreg"
        }

    How it works:
        1. TF-IDF vectorizer transforms text → sparse feature vector
           (same vocabulary as during training)
        2. Logistic Regression's predict_proba() returns a probability
           distribution over all classes
        3. argmax gives the predicted class and its confidence
    """
    if _pipeline is None:
        raise RuntimeError("Text classifier not loaded. Call load_model() first.")

    # predict_proba returns shape (1, num_classes)
    probas = _pipeline.predict_proba([text])[0]   # shape: (num_classes,)
    classes = _pipeline.classes_                    # e.g. ["broken_streetlight", "garbage", ...]

    best_idx = int(np.argmax(probas))
    return {
        "category": classes[best_idx],
        "confidence": float(probas[best_idx]),
        "all_scores": {cls: float(prob) for cls, prob in zip(classes, probas)},
        "source": "tfidf_logreg",
    }


def is_ready() -> bool:
    """Check if the text classifier has been loaded successfully."""
    return _pipeline is not None
