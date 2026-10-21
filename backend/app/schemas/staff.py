from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class StaffBase(BaseModel):
    employee_id: str
    name: str
    department: str
    designation: str
    photo_url: Optional[str] = None
    institution_id: Optional[int] = None


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    photo_url: Optional[str] = None


class StaffOut(StaffBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
