from fastapi import FastAPI
from pydantic import BaseModel
import joblib

# Load trained model
model = joblib.load("complaint_model.pkl")
vectorizer = joblib.load("vectorizer.pkl")

app = FastAPI(title="Complaint Classification API")

class Complaint(BaseModel):
    text: str

@app.post("/predict")
def predict_category(complaint: Complaint):
    X = vectorizer.transform([complaint.text])
    category = model.predict(X)[0]
    return {"category": category}
