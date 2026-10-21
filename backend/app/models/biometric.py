from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from app.core.database import Base


class BiometricTemplate(Base):
    __tablename__ = "biometric_templates"

    id = Column(Integer, primary_key=True, index=True)
    person_type = Column(String(50), nullable=False, index=True)  # student, staff
    person_identifier = Column(String(100), unique=True, index=True, nullable=False)  # register_number or employee_id
    embedding_data = Column(Text, nullable=False)  # JSON-encoded 512-d or 128-d float array
    model_version = Column(String(50), default="arcface-mobilefacenet-v1")
    is_active = Column(Boolean, default=True)
    enrolled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
