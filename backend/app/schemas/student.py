from typing import Optional, List, Dict, Any
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
    contact_number: Optional[str] = None
    phone_number: Optional[str] = None


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


class AccommodationUpdateRequest(BaseModel):
    residence_type: str  # Hosteller, PG, Day Scholar

    # Hostel
    hostel_name: Optional[str] = None
    hostel_block: Optional[str] = None
    room_number: Optional[str] = None
    hostel_address: Optional[str] = None

    # PG
    pg_name: Optional[str] = None
    pg_address: Optional[str] = None
    pg_contact: Optional[str] = None
    distance_from_campus: Optional[str] = None

    # Day Scholar
    residential_address: Optional[str] = None
    contact_number: Optional[str] = None
    phone_number: Optional[str] = None
    transportation_type: Optional[str] = None  # College Bus, Own Vehicle, Other
    bus_route: Optional[str] = None
    bus_boarding_point: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    transport_description: Optional[str] = None

    # Metadata & Notes
    notes: Optional[str] = None
    updated_by: Optional[str] = None
    effective_date: Optional[str] = None


class AccommodationHistoryOut(BaseModel):
    id: int
    register_number: str
    previous_residence_type: Optional[str] = None
    previous_details: Optional[Dict[str, Any]] = None
    new_residence_type: str
    new_details: Dict[str, Any]
    effective_date: str
    updated_by: str
    updated_timestamp: datetime

    class Config:
        from_attributes = True


class StudentAccommodationOut(BaseModel):
    register_number: str
    name: str
    department: str
    year_roman: str
    batch: str
    program: str
    photo_url: Optional[str] = None

    residence_type: str
    hostel_name: Optional[str] = None
    hostel_block: Optional[str] = None
    room_number: Optional[str] = None
    hostel_address: Optional[str] = None

    pg_name: Optional[str] = None
    pg_address: Optional[str] = None
    pg_contact: Optional[str] = None
    distance_from_campus: Optional[str] = None

    residential_address: Optional[str] = None
    contact_number: Optional[str] = None
    phone_number: Optional[str] = None
    transportation_type: Optional[str] = None
    bus_route: Optional[str] = None
    bus_boarding_point: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    transport_description: Optional[str] = None

    accommodation_notes: Optional[str] = None
    residence_updated_at: Optional[datetime] = None
    residence_updated_by: Optional[str] = None

    history: List[AccommodationHistoryOut] = []

    class Config:
        from_attributes = True

