from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Supervisor(Base):
    __tablename__ = "supervisors"

    id = Column(Integer, primary_key=True, index=True)
    supervisor_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    department = Column(String(150), default="Campus Security & Safety")
    assigned_zone = Column(String(150), default="Main Campus Zone")
    phone = Column(String(50), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    guards = relationship("SecurityGuard", back_populates="supervisor")


class SecurityGuard(Base):
    __tablename__ = "security_guards"

    id = Column(Integer, primary_key=True, index=True)
    guard_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    current_gate = Column(String(100), default="Gate 1 Main Entrance")
    shift_name = Column(String(50), default="General Shift")
    shift_start = Column(String(20), default="08:00 AM")
    shift_end = Column(String(20), default="04:00 PM")
    status = Column(String(50), default="On Duty")  # On Duty, Off Duty, Break
    assigned_supervisor_id = Column(Integer, ForeignKey("supervisors.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    supervisor = relationship("Supervisor", back_populates="guards")
