from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ManagerRequestCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=150)
    message: str = Field(..., min_length=1, max_length=500)
    manager_name: Optional[str] = "Priya Raman"
    manager_username: Optional[str] = "manager"
    institution: Optional[str] = "SRM GROUP OF INSTITUTIONS TRICHY"


class AdminReplyCreate(BaseModel):
    reply_message: str = Field(..., min_length=1, max_length=500)
    admin_name: Optional[str] = "Avery Williams"
    admin_username: Optional[str] = "admin"


class ManagerRequestResponse(BaseModel):
    id: int
    request_id: str
    manager_username: str
    manager_name: str
    institution: str
    subject: str
    message: str
    status: str
    created_at: str
    admin_viewed_at: Optional[str] = None
    admin_username: Optional[str] = None
    admin_name: Optional[str] = None
    reply_message: Optional[str] = None
    replied_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
