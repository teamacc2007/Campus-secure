from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from app.core.database import Base


class ManagerRequest(Base):
    __tablename__ = "manager_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(100), unique=True, index=True, nullable=False)
    manager_username = Column(String(100), index=True, nullable=False, default="manager")
    manager_name = Column(String(255), nullable=False)
    institution = Column(String(255), nullable=False)
    subject = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="Sent", index=True)  # "Sent", "Viewed", "Replied"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    admin_viewed_at = Column(DateTime, nullable=True)
    admin_username = Column(String(100), nullable=True)
    admin_name = Column(String(255), nullable=True)
    reply_message = Column(Text, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    metadata_json = Column(JSON, nullable=True)
