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

    guard_id = log_data.guard_id
    if not guard_id and log_data.guard_name:
        from app.models.guard import SecurityGuard
        guard_record = db.query(SecurityGuard).filter(SecurityGuard.name == log_data.guard_name).first()
        if guard_record:
            guard_id = guard_record.id

    access_log = AccessLog(
        record_identifier=log_data.record_identifier,
        person_type=log_data.person_type,
        name=log_data.name,
        identifier_value=log_data.identifier_value,
        phone_number=log_data.phone_number,
        department=log_data.department,
        location_block=log_data.location_block,
        guard_name=log_data.guard_name,
        guard_id=guard_id,
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
    log_id: Any,
    review: AccessLogReviewRequest,
    actor_name: str,
    actor_number: str,
    effective_sup_id: Optional[int] = None,
) -> AccessLog:
    # 1. Locate existing access log by integer id, record_identifier, or review.event_id
    log_entry = None
    if isinstance(log_id, int) or (isinstance(log_id, str) and log_id.isdigit()):
        log_entry = db.query(AccessLog).filter(AccessLog.id == int(log_id)).first()

    if not log_entry and isinstance(log_id, str):
        log_entry = db.query(AccessLog).filter(AccessLog.record_identifier == log_id).first()

    if not log_entry and review.event_id:
        log_entry = db.query(AccessLog).filter(AccessLog.record_identifier == review.event_id).first()

    # If log_entry does not exist in DB yet (e.g. initial seeded alert like DEN-•••-4039), insert it
    if not log_entry:
        rec_id = str(log_id) if log_id else (review.event_id or f"DEN-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        log_entry = AccessLog(
            record_identifier=rec_id,
            person_type="Unauthorized",
            name=review.name or "Unrecognized Person",
            identifier_value="UNREC-FACE",
            location_block=review.location_block or "Gate 1 Main Entrance",
            guard_name=review.guard_name or "G. Selvam",
            event_type="ENTRY",
            verification_method="Face Recognition",
            verification_status="Authorized" if review.action_type in ("Verified", "Authorised") else "Unauthorized",
            review_status="Pending Verification",
            review_actions=[],
            flag_reason=review.reason or "Unauthorized person detected at security gate",
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

    # 2. Scope check: verify guard is within supervisor's institutional scope if supervisor_id provided
    if effective_sup_id:
        from app.models.guard import SecurityGuard
        if log_entry.guard_id:
            guard = db.query(SecurityGuard).filter(SecurityGuard.id == log_entry.guard_id).first()
            if guard and guard.assigned_supervisor_id and guard.assigned_supervisor_id != effective_sup_id:
                raise PermissionError("Access denied: Event is outside supervisor's assigned institutional scope.")
        elif log_entry.guard_name:
            guard = db.query(SecurityGuard).filter(SecurityGuard.name == log_entry.guard_name).first()
            if guard and guard.assigned_supervisor_id and guard.assigned_supervisor_id != effective_sup_id:
                raise PermissionError("Access denied: Event is outside supervisor's assigned institutional scope.")

    # 3. Prevent duplicate or conflicting decisions
    current_actions = list(log_entry.review_actions or [])
    prev_status = log_entry.review_status

    # If already revoked, cannot transition
    if prev_status == "Revoked":
        return log_entry

    # If already in the target state, check for duplicate action to prevent redundant review entries
    if prev_status == review.action_type:
        if current_actions and current_actions[-1].get("type") == review.action_type:
            return log_entry

    # If already Authorised/Verified and requesting Authorised/Verified
    if prev_status in ("Authorised", "Verified") and review.action_type in ("Authorised", "Verified"):
        return log_entry

    decision_timestamp = datetime.now().strftime("%d-%m-%Y %H:%M")
    event_id = log_entry.record_identifier or str(log_entry.id)
    norm_status = "Authorized" if review.action_type in ("Verified", "Authorised") else "Unauthorized"

    action_entry = {
        "type": review.action_type,
        "actor": actor_name,
        "actorNumber": actor_number,
        "timestamp": decision_timestamp,
        "reason": review.reason or (f"Action taken by {actor_name}" if review.action_type == "Unauthorised" else None),
        "event_id": event_id,
        "verification_status": norm_status,
        "decision_made_by": actor_name,
        "supervisor_id": actor_number,
        "supervisor_name": actor_name,
        "action_taken": review.reason if review.action_type == "Unauthorised" else None,
        "decision_timestamp": decision_timestamp,
        "previous_status": prev_status,
        "updated_status": review.action_type,
    }

    current_actions.append(action_entry)
    log_entry.review_actions = current_actions
    log_entry.review_status = review.action_type
    log_entry.verification_status = norm_status
    if review.action_type == "Unauthorised" and review.reason:
        log_entry.flag_reason = review.reason

    db.commit()
    db.refresh(log_entry)
    return log_entry
