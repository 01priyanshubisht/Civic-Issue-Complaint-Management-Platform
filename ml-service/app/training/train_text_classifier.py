"""
train_text_classifier.py — One-time training script for TF-IDF + Logistic Regression.

Run this once to generate app/models/text_classifier.pkl

Usage:
    cd civicai/ml-service
    python app/training/train_text_classifier.py

Interview concept:
    TF-IDF (Term Frequency-Inverse Document Frequency):
        - TF: How often does a word appear in THIS document?
        - IDF: How rare is this word across ALL documents?
        - TF-IDF = TF × IDF → rare, specific words get higher weight
        - "pothole" in a short complaint = high TF-IDF
        - "the", "is", "a" = very low TF-IDF (appear everywhere)

    Logistic Regression:
        - Linear model: learns a weight for each TF-IDF feature per class
        - Outputs class probabilities via softmax
        - Extremely interpretable, fast, works well on short text
        - Can explain: "This was classified as 'pothole' because the words
          'hole', 'road', 'crater' had high weights for that class"
"""

import joblib
import os
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# ─── Training Data ────────────────────────────────────────────────────────────
# Real-world civic complaint texts. Each label corresponds to a category.
# For production: replace with a larger labeled dataset from your DB.
TRAINING_DATA = [
    # pothole
    ("There is a huge pothole on MG Road near the bus stop", "pothole"),
    ("Big hole in the middle of the road causing accidents", "pothole"),
    ("Deep pothole on Residency Road after the rain", "pothole"),
    ("Road has multiple craters near the school gate", "pothole"),
    ("The pothole on 5th cross is damaging vehicles", "pothole"),
    ("Massive road hole near the signal junction", "pothole"),
    ("Pothole filled with water causing bike accidents", "pothole"),
    ("There are multiple potholes on the highway stretch", "pothole"),
    ("Road has cracked and formed a large hole near market", "pothole"),
    ("The ditch in front of my house is getting bigger", "pothole"),
    ("Crater on main road since last monsoon", "pothole"),
    ("Road damage near school with a dangerous hole", "pothole"),
    ("Vehicles are getting damaged due to potholes on Link Road", "pothole"),
    ("The road has sunk and formed a hollow near the underpass", "pothole"),
    ("Large depression in road surface near temple", "pothole"),

    # garbage
    ("Garbage is piling up near the park for 3 days", "garbage"),
    ("No garbage collection in our area for a week", "garbage"),
    ("Overflowing dustbin near the school", "garbage"),
    ("Waste dump near the residential area creating health hazard", "garbage"),
    ("Trash is not being picked up since Monday", "garbage"),
    ("The municipal garbage truck has not come this week", "garbage"),
    ("Burning garbage near residential area causing smoke", "garbage"),
    ("Illegal garbage dump near the lake", "garbage"),
    ("Waste is scattered all over the park entrance", "garbage"),
    ("Open garbage dump is attracting stray dogs", "garbage"),
    ("The lane is full of plastic waste and no one is cleaning", "garbage"),
    ("Sewage mixed with garbage overflowing on street", "garbage"),
    ("Commercial area with uncollected waste for 5 days", "garbage"),
    ("Rotting garbage near the apartment complex", "garbage"),
    ("Waste pile blocking the footpath near bus stand", "garbage"),

    # waterlogging
    ("The road is waterlogged after rain near my house", "waterlogging"),
    ("Standing water on the road for 2 days", "waterlogging"),
    ("Flooded street near the market after last night's rain", "waterlogging"),
    ("Water is not draining from the road near Indiranagar", "waterlogging"),
    ("The drain is blocked and water is overflowing on road", "waterlogging"),
    ("Knee-deep water on the main road due to clogged drains", "waterlogging"),
    ("Flooding near the underpass is making it impassable", "waterlogging"),
    ("Heavy rainfall has caused flooding in the residential area", "waterlogging"),
    ("Stagnant water breeding mosquitoes near the colony", "waterlogging"),
    ("The storm drain is overflowing causing road submersion", "waterlogging"),
    ("Puddles on road are getting bigger due to drainage failure", "waterlogging"),
    ("Water logging issue for the past week with no resolution", "waterlogging"),
    ("The culvert is broken and causing the road to flood", "waterlogging"),
    ("Flash flooding on the main street after the downpour", "waterlogging"),
    ("Low-lying area has retained water for over a week", "waterlogging"),

    # broken_streetlight
    ("Street light near our colony is not working for a week", "broken_streetlight"),
    ("Three consecutive street lights are out on 4th main", "broken_streetlight"),
    ("The lamp post is broken and wires are exposed", "broken_streetlight"),
    ("Dark road due to non-functioning street lights", "broken_streetlight"),
    ("Our entire street has been dark for 5 days", "broken_streetlight"),
    ("Broken street light making the road unsafe at night", "broken_streetlight"),
    ("Flickering light near the school causing issues at night", "broken_streetlight"),
    ("No street lighting from the junction to the park", "broken_streetlight"),
    ("The sodium light bulb has blown near bus stop", "broken_streetlight"),
    ("Electrical pole lamp is not working since last week", "broken_streetlight"),
    ("Night time visibility is zero due to light outage", "broken_streetlight"),
    ("LED street light panel is damaged on Outer Ring Road", "broken_streetlight"),
    ("Public light post fallen on footpath after storm", "broken_streetlight"),
    ("Road illumination absent causing accidents after dark", "broken_streetlight"),
    ("Street lamp wires hanging dangerously near playground", "broken_streetlight"),

    # road_damage
    ("The road surface has completely eroded and needs repair", "road_damage"),
    ("Tar is peeling off from the road near the highway", "road_damage"),
    ("Road has cracks running across the entire width", "road_damage"),
    ("The road near the bridge has severe surface damage", "road_damage"),
    ("Asphalt is completely worn out on the service road", "road_damage"),
    ("Road construction is incomplete and causing damage", "road_damage"),
    ("The newly laid road has already started breaking", "road_damage"),
    ("Road shoulder has collapsed causing vehicles to fall", "road_damage"),
    ("The tarmac has developed deep fissures after summer", "road_damage"),
    ("Road near flyover is broken and causing vehicle damage", "road_damage"),
    ("Surface deterioration on NH-44 stretch near Krishnagiri", "road_damage"),
    ("Uneven road surface with exposed gravel causing accidents", "road_damage"),
    ("The concrete road has developed cracks and subsided", "road_damage"),
    ("Road damage from heavy vehicle movement near quarry", "road_damage"),
    ("Road edge crumbling causing safety hazard for two-wheelers", "road_damage"),
]

# ─── Prepare Data ─────────────────────────────────────────────────────────────
texts = [item[0] for item in TRAINING_DATA]
labels = [item[1] for item in TRAINING_DATA]

X_train, X_test, y_train, y_test = train_test_split(
    texts, labels, test_size=0.2, random_state=42, stratify=labels
)

# ─── Build Pipeline ───────────────────────────────────────────────────────────
# sklearn Pipeline chains preprocessing + model into a single object.
# This is the "correct" way to package an ML model — vectorizer and classifier
# are saved together in one .pkl file.
pipeline = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            max_features=5000,      # Vocabulary cap
            ngram_range=(1, 2),     # Unigrams AND bigrams: "broken light" as one feature
            stop_words="english",   # Remove "the", "is", "a" etc.
            lowercase=True,
            sublinear_tf=True,      # Use log(1+TF) to dampen extreme frequencies
        ),
    ),
    (
        "classifier",
        LogisticRegression(
            max_iter=1000,
            C=1.0,                  # Regularization: higher C = less regularization
            solver="lbfgs",         # Good default for small multiclass problems
        ),
    ),
])

# ─── Train ────────────────────────────────────────────────────────────────────
print("Training TF-IDF + Logistic Regression pipeline...")
pipeline.fit(X_train, y_train)

# ─── Evaluate ─────────────────────────────────────────────────────────────────
y_pred = pipeline.predict(X_test)
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Quick demo
test_texts = [
    "There is a pothole near the school gate",
    "Garbage has not been collected for 5 days",
    "Street light is not working",
]
for t in test_texts:
    pred = pipeline.predict([t])[0]
    proba = pipeline.predict_proba([t])[0]
    confidence = max(proba)
    print(f"  Text: '{t}'\n  Prediction: {pred} ({confidence:.2%})\n")

# ─── Save ─────────────────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
model_path = MODEL_DIR / "text_classifier.pkl"

joblib.dump(pipeline, model_path)
print(f"\n✅ Model saved to: {model_path}")
