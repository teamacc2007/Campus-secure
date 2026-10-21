from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class VisitorPassDraft(BaseModel):
    visitor_name: str
    visitor_phone: str
    purpose: str
    proof_document_url: Optional[str] = None
    photo_url: Optional[str] = None
    event_name: Optional[str] = None
    event_purpose: Optional[str] = None
    start_date: str
    end_date: str
    accessible_blocks: List[str] = Field(default_factory=list)
    coordinator_name: str
    coordinator_phone: str
    is_bulk: bool = False


class VisitorPassCancel(BaseModel):
    reason: str = Field(..., min_length=3, description="Mandatory cancellation reason")


class VisitorPassOut(BaseModel):
    id: int
    pass_number: str
    visitor_name: str
    visitor_phone: str
    photo_url: Optional[str] = None
    purpose: str
    proof_document_url: Optional[str] = None
    event_name: Optional[str] = None
    event_purpose: Optional[str] = None
    start_date: str
    end_date: str
    accessible_blocks: List[str]
    coordinator_name: str
    coordinator_phone: str
    status: str
    is_bulk: bool
    cancellation_reason: Optional[str] = None
    cancelled_by: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
