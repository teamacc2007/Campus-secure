from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.notification import Notification


def create_notification(
    db: Session,
    title: str,
    message: str,
    recipient_role: Optional[str] = None,
    recipient_username: Optional[str] = None,
    notification_type: str = "INFO",
    reference_id: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None,
) -> Notification:
    notif = Notification(
        title=title,
        message=message,
        recipient_role=recipient_role,
        recipient_username=recipient_username,
        notification_type=notification_type,
        reference_id=reference_id,
        metadata_json=metadata_json or {},
        created_at=datetime.now(timezone.utc),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def list_notifications(
    db: Session,
    role: Optional[str] = None,
    username: Optional[str] = None,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
) -> List[Notification]:
    q = db.query(Notification)
    if role:
        q = q.filter((Notification.recipient_role == role) | (Notification.recipient_role == "all"))
    if username:
        q = q.filter(Notification.recipient_username == username)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    return q.order_by(desc(Notification.id)).offset(skip).limit(limit).all()


def mark_notification_read(db: Session, notif_id: int) -> Optional[Notification]:
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif
