from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class StudentBase(BaseModel):
    register_number: str
    name: str
    initials: Optional[str] = None
    date_of_birth: Optional[str] = None
    department: str
    year_roman: str = "I Year"
    batch: str
    residence_type: str = "Hostel"
    hostel_name: Optional[str] = None
    room_number: Optional[str] = None
    bus_route: Optional[str] = None
    bus_boarding_point: Optional[str] = None
    vehicle_number: Optional[str] = None
    photo_url: Optional[str] = None
    institution_id: Optional[int] = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    year_roman: Optional[str] = None
    batch: Optional[str] = None
    residence_type: Optional[str] = None
    hostel_name: Optional[str] = None
    room_number: Optional[str] = None
    bus_route: Optional[str] = None
    bus_boarding_point: Optional[str] = None
    vehicle_number: Optional[str] = None
    photo_url: Optional[str] = None


class StudentOut(StudentBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
