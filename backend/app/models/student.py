from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
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
    residence_type = Column(String(50), default="Hostel")  # Hostel, Day Scholar
    hostel_name = Column(String(100), nullable=True)
    room_number = Column(String(50), nullable=True)
    bus_route = Column(String(50), nullable=True)
    bus_boarding_point = Column(String(100), nullable=True)
    vehicle_number = Column(String(50), nullable=True)

    # Biometric / Photo
    photo_url = Column(String(500), nullable=True)
    face_embedding = Column(Text, nullable=True)  # JSON-serialized embedding vector

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    institution = relationship("Institution", back_populates="students")
    access_logs = relationship("AccessLog", back_populates="student", cascade="all, delete-orphan")
