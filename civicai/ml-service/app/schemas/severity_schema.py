from pydantic import BaseModel, Field
from typing import List

class SeverityAssessmentRequest(BaseModel):
    category: str = Field(..., description="The predicted or selected category of the complaint.")
    text: str = Field(..., description="The complaint description text.")
    duplicate_count: int = Field(default=0, description="Number of duplicate or nearby similar complaints.")
    image_confidence: float = Field(default=0.0, description="Confidence score from image classification (if available).")

class SeverityAssessmentResponse(BaseModel):
    severity: str = Field(..., description="Severity level: Low, Medium, High, Critical")
    priority: str = Field(..., description="Priority level: Normal, Important, Urgent, Emergency")
    reason: List[str] = Field(..., description="List of reasons explaining the assessment.")
