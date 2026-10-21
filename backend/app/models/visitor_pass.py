from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class VisitorPass(Base):
    __tablename__ = "visitor_passes"

    id = Column(Integer, primary_key=True, index=True)
    pass_number = Column(String(50), unique=True, index=True, nullable=False)
    visitor_name = Column(String(255), nullable=False, index=True)
    visitor_phone = Column(String(50), nullable=False)
    photo_url = Column(String(500), nullable=True)
    purpose = Column(String(255), nullable=False)
    proof_document_url = Column(String(500), nullable=True)

    # Event / Access Scope
    event_name = Column(String(255), nullable=True)
    event_purpose = Column(String(255), nullable=True)
    start_date = Column(String(50), nullable=False)
    end_date = Column(String(50), nullable=False)
    accessible_blocks = Column(JSON, nullable=False, default=list)  # ["Admin Block", "Library", etc.]

    # Host / Coordinator
    coordinator_name = Column(String(255), nullable=False)
    coordinator_phone = Column(String(50), nullable=False)

    # Status & Audit
    status = Column(String(50), nullable=False, default="Active", index=True)  # Active, Cancelled, Expired
    is_bulk = Column(Boolean, default=False)
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by = Column(String(100), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    access_logs = relationship("AccessLog", back_populates="visitor_pass", cascade="all, delete-orphan")
