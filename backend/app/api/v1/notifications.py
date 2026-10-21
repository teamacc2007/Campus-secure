from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.notification import Notification
from app.services.notification_service import list_notifications, mark_notification_read
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def get_user_notifications(
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifs = list_notifications(
        db,
        role=current_user.role,
        username=current_user.username,
        unread_only=unread_only,
    )
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "reference_id": n.reference_id,
            "is_read": n.is_read,
            "metadata": n.metadata_json,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


@router.post("/{notification_id}/read")
def mark_read_endpoint(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = mark_notification_read(db, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"success": True, "id": notif.id, "is_read": notif.is_read}
