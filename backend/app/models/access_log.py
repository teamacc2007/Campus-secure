from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_identifier = Column(String(50), unique=True, index=True, nullable=False)
    person_type = Column(String(50), nullable=False, index=True)  # Student, Staff, Visitor, Unauthorized
    name = Column(String(255), nullable=False, index=True)
    identifier_value = Column(String(100), nullable=False, index=True)  # Reg No, Emp ID, or Pass No
    phone_number = Column(String(50), nullable=True)
    department = Column(String(150), nullable=True)

    # Location & Guard
    location_block = Column(String(150), nullable=False, default="Gate 1 Main Entrance")
    guard_name = Column(String(100), nullable=True)
    event_type = Column(String(20), nullable=False, default="ENTRY")  # ENTRY, EXIT

    # Verification & Review
    verification_method = Column(String(50), nullable=False, default="Face Recognition")
    verification_status = Column(String(50), nullable=False, default="Authorized")  # Authorized, Flagged, Unauthorized
    review_status = Column(String(50), nullable=False, default="Verified", index=True)  # Pending Verification, Verified, Unauthorised, Revoked
    review_actions = Column(JSON, nullable=False, default=list)  # List of {type, actor, actorNumber, timestamp, reason}
    flag_reason = Column(Text, nullable=True)
    snapshot_url = Column(String(500), nullable=True)

    # References
    student_id = Column(Integer, ForeignKey("students.id", ondelete="SET NULL"), nullable=True)
    staff_id = Column(Integer, ForeignKey("staff.id", ondelete="SET NULL"), nullable=True)
    visitor_pass_id = Column(Integer, ForeignKey("visitor_passes.id", ondelete="SET NULL"), nullable=True)

    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    student = relationship("Student", back_populates="access_logs")
    staff = relationship("Staff", back_populates="access_logs")
    visitor_pass = relationship("VisitorPass", back_populates="access_logs")
