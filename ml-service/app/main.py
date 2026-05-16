"""
main.py — FastAPI application entry point.

Startup sequence (lifespan):
    1. Load text classifier (TF-IDF + LogReg from .pkl)
    2. Initialize Roboflow (hosted inference API)
    3. Load sentence embedding model (SentenceTransformer)
    4. Initialize ChromaDB (persistent vector store)
    5. Initialize Gemini API client

All models are loaded ONCE at startup and reused across all requests.
This is the standard production pattern for ML services.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import predict, similarity, summarize, severity
from app.services import (
    text_service,
    roboflow_service,
    embedding_service,
    chroma_service,
    gemini_service,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan event handler.
    Code BEFORE `yield` runs at startup.
    Code AFTER `yield` runs at shutdown.
    """
    print("\n" + "=" * 50)
    print("  CivicAI ML Service Starting Up")
    print("=" * 50)

    # 1. Load text classifier
    print("\n[1/5] Loading text classifier...")
    try:
        text_service.load_model()
    except FileNotFoundError as e:
        print(f"  ⚠️  {e}")
        print("  → Run: python app/training/train_text_classifier.py")

    # 2. Initialize Roboflow
    print("\n[2/5] Initializing Roboflow API...")
    roboflow_service.init_roboflow()

    # 3. Load embedding model
    print("\n[3/5] Loading sentence embedding model...")
    embedding_service.load_model()

    # 4. Initialize ChromaDB
    print("\n[4/5] Initializing ChromaDB...")
    chroma_service.init_chromadb()

    # 5. Initialize Gemini API
    print("\n[5/5] Initializing Gemini API...")
    gemini_service.init_gemini()

    print("\n" + "=" * 50)
    print("  ✅ ML Service Ready")
    print("  📚 Docs: http://localhost:8000/docs")
    print("=" * 50 + "\n")

    yield  # Application runs here

    print("ML Service shutting down.")


# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="CivicAI ML Service",
    description=(
        "AI/ML orchestration service for the Civic Issue Complaint Management Platform.\n\n"
        "Provides: category prediction (Roboflow + TF-IDF), "
        "semantic duplicate detection (ChromaDB + sentence-transformers), "
        "and structured complaint summarization (Gemini API)."
    ),
    version="1.1.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(predict.router)
app.include_router(similarity.router)
app.include_router(summarize.router)
app.include_router(severity.router)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Simple health check endpoint.
    """
    return {
        "status": "healthy",
        "service": "CivicAI ML Service",
        "version": "1.1.0",
        "components": {
            "text_classifier": "ready" if text_service.is_ready() else "not_loaded",
            "roboflow": "ready" if roboflow_service.is_ready() else "fallback_mode",
            "gemini": "ready" if gemini_service.is_ready() else "fallback_mode",
            "chroma_db": "ready",
        },
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "CivicAI ML Service is running.",
        "docs": "/docs",
        "health": "/health",
    }
