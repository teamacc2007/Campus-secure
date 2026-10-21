from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False, index=True)
    department = Column(String(150), nullable=False, index=True)
    designation = Column(String(100), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)

    photo_url = Column(String(500), nullable=True)
    face_embedding = Column(Text, nullable=True)  # JSON-serialized embedding vector

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    institution = relationship("Institution", back_populates="staff_members")
    access_logs = relationship("AccessLog", back_populates="staff", cascade="all, delete-orphan")
