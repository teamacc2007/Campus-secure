from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FaceVerifyRequest(BaseModel):
    image_base64: Optional[str] = None
    register_number: Optional[str] = None
    employee_id: Optional[str] = None
    location_block: str = "Gate 1 Main Entrance"
    guard_name: Optional[str] = "G. Selvam"


class MatchedPerson(BaseModel):
    person_type: str  # "student" | "staff"
    identifier: str
    name: str
    initials: Optional[str] = None
    department: str
    year_roman: Optional[str] = None
    batch: Optional[str] = None
    residence_type: Optional[str] = None
    hostel_name: Optional[str] = None
    room_number: Optional[str] = None
    designation: Optional[str] = None
    photo_url: Optional[str] = None
    similarity_score: float


class LivenessCheckResult(BaseModel):
    is_live: bool
    confidence: float
    checks: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None


class FaceVerifyResponse(BaseModel):
    success: bool
    is_recognized: bool
    is_live: bool
    verification_status: str  # "Authorized" | "Flagged" | "Unauthorized"
    similarity_score: float
    matched_person: Optional[MatchedPerson] = None
    liveness_details: Optional[LivenessCheckResult] = None
    message: str
