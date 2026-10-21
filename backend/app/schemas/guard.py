from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class GuardBase(BaseModel):
    guard_code: str
    name: str
    phone: str
    current_gate: str = "Gate 1 Main Entrance"
    shift_name: str = "General Shift"
    shift_start: str = "08:00 AM"
    shift_end: str = "04:00 PM"
    status: str = "On Duty"
    assigned_supervisor_id: Optional[int] = None


class GuardCreate(GuardBase):
    pass


class GuardUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    current_gate: Optional[str] = None
    shift_name: Optional[str] = None
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    status: Optional[str] = None
    assigned_supervisor_id: Optional[int] = None


class GuardOut(GuardBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SupervisorBase(BaseModel):
    supervisor_code: str
    name: str
    department: str = "Campus Security & Safety"
    assigned_zone: str = "Main Campus Zone"
    phone: Optional[str] = None


class SupervisorCreate(SupervisorBase):
    pass


class SupervisorOut(SupervisorBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
