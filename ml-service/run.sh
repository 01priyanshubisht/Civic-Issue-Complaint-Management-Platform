#!/bin/bash
# run.sh — Start the FastAPI ML service
# Usage: bash run.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Prefer venv312 (correct python version)
if [ -d "venv312" ]; then
    source venv312/bin/activate
    echo "✅ Python 3.12 virtual environment activated"
elif [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Virtual environment activated ($(python --version))"
else
    echo "⚠️  No virtual environment found. Using system Python."
fi

# Check if text classifier model exists; if not, run training script
if [ ! -f "app/models/text_classifier.pkl" ]; then
    echo ""
    echo "⚠️  Text classifier model not found. Training now..."
    echo "────────────────────────────────────────────────────"
    python app/training/train_text_classifier.py
fi

# Create necessary directories
mkdir -p app/models chroma_db

echo ""
echo "════════════════════════════════════════"
echo "  Starting CivicAI ML Service"
echo "  URL: http://localhost:8000"
echo "  Docs: http://localhost:8000/docs"
echo "════════════════════════════════════════"
echo ""

# Start FastAPI with uvicorn
# --reload: auto-restart on code changes (dev mode)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
