import random
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.manager_request import ManagerRequest
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.schemas.manager_request import (
    ManagerRequestCreate,
    AdminReplyCreate,
    ManagerRequestResponse,
)

router = APIRouter(prefix="/manager-requests", tags=["Manager Requests"])


def generate_request_id(db: Session) -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    for _ in range(20):
        suffix = random.randint(1000, 9999)
        candidate = f"REQ-{today_str}-{suffix}"
        if not db.query(ManagerRequest).filter(ManagerRequest.request_id == candidate).first():
            return candidate
    return f"REQ-{today_str}-{int(datetime.now().timestamp()) % 100000}"


def to_response_dict(req: ManagerRequest) -> dict:
    return {
        "id": req.id,
        "request_id": req.request_id,
        "manager_username": req.manager_username,
        "manager_name": req.manager_name,
        "institution": req.institution,
        "subject": req.subject,
        "message": req.message,
        "status": req.status,
        "created_at": req.created_at.isoformat() if req.created_at else datetime.now(timezone.utc).isoformat(),
        "admin_viewed_at": req.admin_viewed_at.isoformat() if req.admin_viewed_at else None,
        "admin_username": req.admin_username,
        "admin_name": req.admin_name,
        "reply_message": req.reply_message,
        "replied_at": req.replied_at.isoformat() if req.replied_at else None,
        "metadata": req.metadata_json or {},
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_manager_request(
    data: ManagerRequestCreate,
    db: Session = Depends(get_db),
):
    subject = data.subject.strip()
    message = data.message.strip()

    if not subject:
        raise HTTPException(status_code=400, detail="Subject is required.")
    if not message:
        raise HTTPException(status_code=400, detail="Message/Query is required.")
    if len(message) > 500:
        raise HTTPException(status_code=400, detail="Message exceeds 500 characters limit.")

    req_id = generate_request_id(db)
    now = datetime.now(timezone.utc)
    time_str = now.strftime("%Y-%m-%d %H:%M:%S")

    manager_name = (data.manager_name or "Priya Raman").strip()
    institution = (data.institution or "SRM GROUP OF INSTITUTIONS TRICHY").strip()
    manager_username = (data.manager_username or "manager").strip()

    new_request = ManagerRequest(
        request_id=req_id,
        manager_username=manager_username,
        manager_name=manager_name,
        institution=institution,
        subject=subject,
        message=message,
        status="Sent",
        created_at=now,
        metadata_json={
            "created_via": "Manager Portal - Institution Students",
            "manager_role": "Institute Manager",
        },
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # 1. Create Notification for Admin Portal
    admin_notif = Notification(
        recipient_role="admin",
        recipient_username=None,
        title="Request from Manager",
        message=f"{manager_name} ({institution}) submitted request: {subject}",
        notification_type="MANAGER_REQUEST",
        reference_id=req_id,
        is_read=False,
        metadata_json={
            "request_id": req_id,
            "manager_name": manager_name,
            "institution": institution,
            "subject": subject,
            "message_preview": message[:100] + ("..." if len(message) > 100 else ""),
            "full_message": message,
            "created_at": now.isoformat(),
            "status": "Sent",
        },
        created_at=now,
    )
    db.add(admin_notif)

    # 2. Record AuditLog: Manager Sent Request
    audit_sent = AuditLog(
        actor_username=manager_username,
        actor_role="Institute Manager",
        action="Request Sent to Admin",
        target_type="ManagerRequest",
        target_id=req_id,
        details={
            "request_id": req_id,
            "subject": subject,
            "manager_name": manager_name,
            "institution": institution,
            "action_details": f"Sent request {req_id} ({subject}) to Admin",
            "comments": message,
        },
        timestamp=now,
    )
    db.add(audit_sent)

    # 3. Record AuditLog: Notification Generated & Delivered
    audit_notif = AuditLog(
        actor_username="system",
        actor_role="System",
        action="Notification Delivered",
        target_type="Notification",
        target_id=req_id,
        details={
            "request_id": req_id,
            "recipient": "Super admin",
            "recipient_role": "admin",
            "action_details": f"Delivered notification for request {req_id} to Admin Portal",
            "comments": f"Subject: {subject}",
        },
        timestamp=now,
    )
    db.add(audit_notif)

    db.commit()

    return {
        "success": True,
        "message": "Request sent successfully. You will be notified once Admin replies.",
        "request": to_response_dict(new_request),
        "audit_logs": [
            {
                "id": f"AUD-REQ-{new_request.id}-1",
                "requestId": req_id,
                "timestamp": time_str,
                "dateTime": now.isoformat(),
                "editedBy": manager_name,
                "editorRole": "Institute Manager",
                "action": "Request Sent to Admin",
                "institution": institution,
                "actionDetails": f"Sent request {req_id} ({subject}) to Admin",
                "comments": message,
            },
            {
                "id": f"AUD-REQ-{new_request.id}-2",
                "requestId": req_id,
                "timestamp": time_str,
                "dateTime": now.isoformat(),
                "editedBy": "System",
                "editorRole": "Super admin",
                "action": "Notification Delivered",
                "institution": institution,
                "actionDetails": f"Delivered notification for request {req_id} to Admin Portal",
                "comments": f"Subject: {subject}",
            },
        ],
    }


@router.get("/")
def list_manager_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    manager_username: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(ManagerRequest)
    if status_filter and status_filter != "All":
        q = q.filter(ManagerRequest.status == status_filter)
    if manager_username:
        q = q.filter(ManagerRequest.manager_username == manager_username)

    requests = q.order_by(desc(ManagerRequest.id)).all()
    return [to_response_dict(r) for r in requests]


@router.get("/{request_id}")
def get_manager_request(
    request_id: str,
    db: Session = Depends(get_db),
):
    req = db.query(ManagerRequest).filter(ManagerRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    return to_response_dict(req)


@router.post("/{request_id}/view")
def mark_request_viewed(
    request_id: str,
    admin_name: Optional[str] = Query("Avery Williams"),
    admin_username: Optional[str] = Query("admin"),
    db: Session = Depends(get_db),
):
    req = db.query(ManagerRequest).filter(ManagerRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    now = datetime.now(timezone.utc)
    time_str = now.strftime("%Y-%m-%d %H:%M:%S")

    # If already Viewed or Replied, keep current status
    if req.status == "Sent":
        req.status = "Viewed"
        req.admin_viewed_at = now
        req.admin_name = admin_name
        req.admin_username = admin_username

        # Mark notification as read
        notif = (
            db.query(Notification)
            .filter(Notification.reference_id == request_id, Notification.recipient_role == "admin")
            .first()
        )
        if notif:
            notif.is_read = True

        # AuditLog entry: Admin viewed request
        audit_viewed = AuditLog(
            actor_username=admin_username or "admin",
            actor_role="Super admin",
            action="Request Viewed by Admin",
            target_type="ManagerRequest",
            target_id=request_id,
            details={
                "request_id": request_id,
                "subject": req.subject,
                "manager_name": req.manager_name,
                "institution": req.institution,
                "action_details": f"Super admin viewed request {request_id}",
                "comments": f"Opened request: {req.subject}",
            },
            timestamp=now,
        )
        db.add(audit_viewed)
        db.commit()
        db.refresh(req)

        return {
            "success": True,
            "request": to_response_dict(req),
            "audit_log": {
                "id": f"AUD-VIEW-{req.id}",
                "requestId": request_id,
                "timestamp": time_str,
                "dateTime": now.isoformat(),
                "editedBy": admin_name or "Avery Williams",
                "editorRole": "Super admin",
                "action": "Request Viewed by Admin",
                "institution": req.institution,
                "actionDetails": f"Super admin viewed request {request_id}",
                "comments": f"Opened request: {req.subject}",
            },
        }

    return {"success": True, "request": to_response_dict(req)}


@router.post("/{request_id}/reply")
def reply_to_manager_request(
    request_id: str,
    data: AdminReplyCreate,
    db: Session = Depends(get_db),
):
    reply_msg = data.reply_message.strip()
    if not reply_msg:
        raise HTTPException(status_code=400, detail="Reply message is required.")
    if len(reply_msg) > 500:
        raise HTTPException(status_code=400, detail="Reply message cannot exceed 500 characters.")

    req = db.query(ManagerRequest).filter(ManagerRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    now = datetime.now(timezone.utc)
    time_str = now.strftime("%Y-%m-%d %H:%M:%S")

    admin_name = (data.admin_name or "Avery Williams").strip()
    admin_username = (data.admin_username or "admin").strip()

    req.status = "Replied"
    req.reply_message = reply_msg
    req.admin_name = admin_name
    req.admin_username = admin_username
    req.replied_at = now

    # 1. Trigger Notification for Manager
    manager_notif = Notification(
        recipient_role="manager",
        recipient_username=req.manager_username,
        title="Admin Replied to Your Request",
        message=f"Admin {admin_name} replied to request {req.request_id} ({req.subject})",
        notification_type="ADMIN_REPLY",
        reference_id=req.request_id,
        is_read=False,
        metadata_json={
            "request_id": req.request_id,
            "manager_name": req.manager_name,
            "institution": req.institution,
            "subject": req.subject,
            "original_message": req.message,
            "reply_message": reply_msg,
            "admin_name": admin_name,
            "replied_at": now.isoformat(),
            "status": "Replied",
        },
        created_at=now,
    )
    db.add(manager_notif)

    # 2. Record AuditLog: Admin Reply Sent
    audit_reply = AuditLog(
        actor_username=admin_username,
        actor_role="Super admin",
        action="Admin Reply Sent",
        target_type="ManagerRequest",
        target_id=req.request_id,
        details={
            "request_id": req.request_id,
            "subject": req.subject,
            "admin_name": admin_name,
            "manager_name": req.manager_name,
            "institution": req.institution,
            "action_details": f"Admin replied to request {req.request_id} ({req.subject})",
            "comments": reply_msg,
        },
        timestamp=now,
    )
    db.add(audit_reply)

    # 3. Record AuditLog: Notification Delivered to Manager
    audit_notif = AuditLog(
        actor_username="system",
        actor_role="System",
        action="Notification Delivered",
        target_type="Notification",
        target_id=req.request_id,
        details={
            "request_id": req.request_id,
            "recipient": "Institute Manager",
            "recipient_role": "manager",
            "action_details": f"Delivered Admin reply notification for {req.request_id} to Manager Portal",
            "comments": f"Subject: {req.subject}",
        },
        timestamp=now,
    )
    db.add(audit_notif)

    db.commit()
    db.refresh(req)

    return {
        "success": True,
        "message": "Reply sent successfully to Manager.",
        "request": to_response_dict(req),
        "audit_logs": [
            {
                "id": f"AUD-REP-{req.id}-1",
                "requestId": req.request_id,
                "timestamp": time_str,
                "dateTime": now.isoformat(),
                "editedBy": admin_name,
                "editorRole": "Super admin",
                "action": "Admin Reply Sent",
                "institution": req.institution,
                "actionDetails": f"Admin replied to request {req.request_id} ({req.subject})",
                "comments": reply_msg,
            },
            {
                "id": f"AUD-REP-{req.id}-2",
                "requestId": req.request_id,
                "timestamp": time_str,
                "dateTime": now.isoformat(),
                "editedBy": "System",
                "editorRole": "Super admin",
                "action": "Notification Delivered",
                "institution": req.institution,
                "actionDetails": f"Delivered Admin reply notification for {req.request_id} to Manager Portal",
                "comments": f"Subject: {req.subject}",
            },
        ],
    }


@router.get("/audit-logs/all")
def get_request_audit_logs(
    db: Session = Depends(get_db),
):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.target_type.in_(["ManagerRequest", "Notification"]))
        .order_by(desc(AuditLog.id))
        .all()
    )
    result = []
    for log in logs:
        d = log.details or {}
        req_id = d.get("request_id") or log.target_id or "REQ-0000"
        dt_str = log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else ""
        result.append({
            "id": f"AUD-DB-{log.id}",
            "requestId": req_id,
            "timestamp": dt_str,
            "dateTime": log.timestamp.isoformat() if log.timestamp else "",
            "editedBy": log.actor_username if log.actor_username != "system" else "System",
            "editorRole": log.actor_role,
            "action": log.action,
            "institution": d.get("institution") or "SRM GROUP OF INSTITUTIONS TRICHY",
            "actionDetails": d.get("action_details") or f"Action {log.action} on {req_id}",
            "comments": d.get("comments") or "",
        })
    return result
