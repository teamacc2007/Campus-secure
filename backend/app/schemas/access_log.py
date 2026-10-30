from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field


class ReviewActionSchema(BaseModel):
    type: str  # "Verified" | "Unauthorised" | "Revoked"
    actor: str
    actorNumber: str
    timestamp: str
    reason: Optional[str] = None


class AccessLogCreate(BaseModel):
    record_identifier: Optional[str] = None
    person_type: str  # "Student" | "Staff" | "Visitor" | "Unauthorized"
    name: str
    identifier_value: str
    phone_number: Optional[str] = None
    department: Optional[str] = None
    location_block: str = "Gate 1 Main Entrance"
    guard_name: Optional[str] = None
    guard_id: Optional[int] = None
    event_type: str = "ENTRY"
    verification_method: str = "Face Recognition"
    verification_status: str = "Authorized"
    review_status: str = "Verified"
    flag_reason: Optional[str] = None
    snapshot_url: Optional[str] = None
    student_id: Optional[int] = None
    staff_id: Optional[int] = None
    visitor_pass_id: Optional[int] = None


class AccessLogReviewRequest(BaseModel):
    action_type: str = Field(..., pattern="^(Verified|Unauthorised|Revoked)$")
    reason: Optional[str] = None


class AccessLogOut(BaseModel):
    id: int
    record_identifier: str
    person_type: str
    name: str
    identifier_value: str
    phone_number: Optional[str] = None
    department: Optional[str] = None
    location_block: str
    guard_name: Optional[str] = None
    guard_id: Optional[int] = None
    guard_code: Optional[str] = None
    event_type: str
    verification_method: str
    verification_status: str
    review_status: str
    review_actions: List[Dict[str, Any]]
    flag_reason: Optional[str] = None
    snapshot_url: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class SupervisorUnauthorizedResponse(BaseModel):
    count: int
    records: List[AccessLogOut]
