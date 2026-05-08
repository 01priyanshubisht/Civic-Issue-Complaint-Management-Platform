# train_model.py
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib


df = pd.read_csv("data.csv")

# Convert text → numerical features
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(df["text"])
y = df["label"]

# Train model
model = LogisticRegression()
model.fit(X, y)

# Save model
joblib.dump(model, "complaint_model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")

print("Model trained and saved")
