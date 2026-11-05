from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    register_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False, index=True)
    initials = Column(String(10), nullable=True)
    date_of_birth = Column(String(50), nullable=True)
    department = Column(String(150), nullable=False, index=True)
    year_roman = Column(String(20), nullable=False, default="I Year")
    batch = Column(String(50), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)
    
    # Accommodation & Transport
    residence_type = Column(String(50), default="Hosteller")  # Hosteller, Day Scholar, PG
    hostel_name = Column(String(100), nullable=True)
    hostel_block = Column(String(100), nullable=True)
    room_number = Column(String(50), nullable=True)
    hostel_address = Column(String(255), nullable=True)

    # PG Details
    pg_name = Column(String(150), nullable=True)
    pg_address = Column(Text, nullable=True)
    pg_contact = Column(String(50), nullable=True)
    distance_from_campus = Column(String(50), nullable=True)

    # Day Scholar Details
    residential_address = Column(Text, nullable=True)
    contact_number = Column(String(50), nullable=True)
    phone_number = Column(String(50), nullable=True)
    transportation_type = Column(String(50), nullable=True)  # College Bus, Own Vehicle, Other
    bus_route = Column(String(50), nullable=True)
    bus_boarding_point = Column(String(100), nullable=True)
    vehicle_type = Column(String(50), nullable=True)
    vehicle_number = Column(String(50), nullable=True)
    transport_description = Column(String(255), nullable=True)

    # Notes & Audit Metadata
    accommodation_notes = Column(Text, nullable=True)
    residence_updated_at = Column(DateTime, nullable=True)
    residence_updated_by = Column(String(100), nullable=True)

    # Biometric / Photo
    photo_url = Column(String(500), nullable=True)
    face_embedding = Column(Text, nullable=True)  # JSON-serialized embedding vector

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    institution = relationship("Institution", back_populates="students")
    access_logs = relationship("AccessLog", back_populates="student", cascade="all, delete-orphan")
    accommodation_history = relationship(
        "AccommodationHistory",
        back_populates="student",
        cascade="all, delete-orphan",
        order_by="desc(AccommodationHistory.id)",
    )


class AccommodationHistory(Base):
    __tablename__ = "accommodation_history"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    register_number = Column(String(50), index=True, nullable=False)

    previous_residence_type = Column(String(50), nullable=True)
    previous_details = Column(JSON, nullable=True)

    new_residence_type = Column(String(50), nullable=False)
    new_details = Column(JSON, nullable=False)

    effective_date = Column(String(50), nullable=False)
    updated_by = Column(String(100), nullable=False)
    updated_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("Student", back_populates="accommodation_history")

