from fastapi import APIRouter
from app.schemas.severity_schema import SeverityAssessmentRequest, SeverityAssessmentResponse
from app.services import severity_service

router = APIRouter(prefix="/severity", tags=["Severity & Priority"])

@router.post("/assess", response_model=SeverityAssessmentResponse)
async def assess_severity_endpoint(body: SeverityAssessmentRequest):
    """
    Assess severity and priority of a complaint based on multiple signals.
    """
    result = severity_service.assess_severity(
        category=body.category,
        text=body.text,
        duplicate_count=body.duplicate_count,
        image_confidence=body.image_confidence
    )
    return SeverityAssessmentResponse(**result)
