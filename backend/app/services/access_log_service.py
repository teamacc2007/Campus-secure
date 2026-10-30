import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.access_log import AccessLog
from app.schemas.access_log import AccessLogCreate, AccessLogReviewRequest


def log_access_event(
    db: Session,
    log_data: AccessLogCreate,
) -> AccessLog:
    if not log_data.record_identifier:
        now_str = datetime.now().strftime("%Y%m%d%H%M%S")
        suffix = uuid.uuid4().hex[:4].upper()
        prefix = "ENT" if log_data.verification_status == "Authorized" else "SEC"
        log_data.record_identifier = f"{prefix}-{now_str}-{suffix}"

    initial_actions = []
    if log_data.verification_status != "Authorized":
        initial_actions.append({
            "type": "Unauthorised",
            "actor": log_data.guard_name or "Security Guard",
            "actorNumber": "GUARD-AUTO",
            "timestamp": datetime.now().strftime("%d-%m-%Y %H:%M"),
            "reason": log_data.flag_reason or "Flagged at entry gate",
        })

    access_log = AccessLog(
        record_identifier=log_data.record_identifier,
        person_type=log_data.person_type,
        name=log_data.name,
        identifier_value=log_data.identifier_value,
        phone_number=log_data.phone_number,
        department=log_data.department,
        location_block=log_data.location_block,
        guard_name=log_data.guard_name,
        event_type=log_data.event_type,
        verification_method=log_data.verification_method,
        verification_status=log_data.verification_status,
        review_status=log_data.review_status,
        review_actions=initial_actions,
        flag_reason=log_data.flag_reason,
        snapshot_url=log_data.snapshot_url,
        student_id=log_data.student_id,
        staff_id=log_data.staff_id,
        visitor_pass_id=log_data.visitor_pass_id,
    )
    db.add(access_log)
    db.commit()
    db.refresh(access_log)
    return access_log


def list_access_logs(
    db: Session,
    role: str = "security",
    person_type: Optional[str] = None,
    review_status: Optional[str] = None,
    verification_status: Optional[str] = None,
    query: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
) -> List[AccessLog]:
    q = db.query(AccessLog)

    # Scoping by role where appropriate
    if role == "warden":
        # Hostels monitoring: students and hostel visitors
        q = q.filter(AccessLog.person_type.in_(["Student", "Visitor"]))
    elif role == "staff":
        # Faculty & Department activity
        q = q.filter(AccessLog.person_type.in_(["Student", "Staff"]))
    elif role == "welfare":
        # Welfare block & hostel logs
        q = q.filter(AccessLog.person_type == "Student")
    elif role == "students":
        # Student Affairs
        q = q.filter(AccessLog.person_type == "Student")

    if person_type and person_type != "All":
        q = q.filter(AccessLog.person_type == person_type)

    if review_status and review_status != "All":
        q = q.filter(AccessLog.review_status == review_status)

    if verification_status and verification_status != "All":
        q = q.filter(AccessLog.verification_status == verification_status)

    if query:
        term = f"%{query.strip()}%"
        q = q.filter(
            (AccessLog.name.ilike(term))
            | (AccessLog.identifier_value.ilike(term))
            | (AccessLog.record_identifier.ilike(term))
            | (AccessLog.location_block.ilike(term))
        )

    return q.order_by(desc(AccessLog.id)).offset(skip).limit(limit).all()


def review_access_log(
    db: Session,
    log_id: int,
    review: AccessLogReviewRequest,
    actor_name: str,
    actor_number: str,
) -> AccessLog:
    log_entry = db.query(AccessLog).filter(AccessLog.id == log_id).first()
    if not log_entry:
        raise ValueError("Access log entry not found.")

    action_entry = {
        "type": review.action_type,
        "actor": actor_name,
        "actorNumber": actor_number,
        "timestamp": datetime.now().strftime("%d-%m-%Y %H:%M"),
        "reason": review.reason or f"Action taken by {actor_name}",
    }

    # Append to review_actions list
    current_actions = list(log_entry.review_actions or [])
    current_actions.append(action_entry)
    
    log_entry.review_actions = current_actions
    log_entry.review_status = review.action_type
    if review.action_type == "Verified":
        log_entry.verification_status = "Authorized"
    elif review.action_type in ("Unauthorised", "Revoked"):
        log_entry.verification_status = "Unauthorized"

    db.commit()
    db.refresh(log_entry)
    return log_entry
