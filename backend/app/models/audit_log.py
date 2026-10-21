from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_username = Column(String(100), nullable=False, index=True)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)  # LOGIN, PASS_CREATE, PASS_CANCEL, VERIFY_FLAG, GUARD_ASSIGN
    target_type = Column(String(50), nullable=True)  # VisitorPass, AccessLog, User, Guard
    target_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
