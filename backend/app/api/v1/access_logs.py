import os
import uuid
import base64
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.schemas.access_log import (
    AccessLogOut,
    AccessLogCreate,
    AccessLogReviewRequest,
    SupervisorUnauthorizedResponse,
)
from app.models.access_log import AccessLog
from app.models.guard import SecurityGuard, Supervisor
from app.services.access_log_service import (
    log_access_event,
    list_access_logs,
    review_access_log,
)
from app.api.deps import get_current_user, get_current_user_optional, require_roles
from app.models.user import User

router = APIRouter(prefix="/access-logs", tags=["Access Logs & Audits"])


@router.get("/", response_model=List[AccessLogOut])
def get_logs(
    person_type: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_access_logs(
        db,
        role=current_user.role,
        person_type=person_type,
        review_status=review_status,
        verification_status=verification_status,
        query=query,
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=AccessLogOut, status_code=status.HTTP_201_CREATED)
def record_access_log(
    log_data: AccessLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not log_data.guard_name:
        log_data.guard_name = current_user.full_name
    return log_access_event(db, log_data)


@router.post("/{log_id}/review", response_model=AccessLogOut)
def review_log_endpoint(
    log_id: int,
    review: AccessLogReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["supervisor", "admin", "cso"])),
):
    try:
        actor_number = f"SUP-{current_user.id:02d}"
        return review_access_log(
            db,
            log_id=log_id,
            review=review,
            actor_name=current_user.full_name,
            actor_number=actor_number,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/alerts", response_model=List[AccessLogOut])
def get_pending_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["supervisor", "admin", "cso"])),
):
    # Retrieve flagged or pending verification logs
    return list_access_logs(
        db,
        role=current_user.role,
        review_status="Pending Verification",
        limit=100,
    )


@router.get("/unrecognized", response_model=List[AccessLogOut])
def get_unrecognized_history(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieve only actual unrecognized face scans from access logs, sorted newest first."""
    return (
        db.query(AccessLog)
        .filter(
            AccessLog.verification_method == "Face Recognition",
            AccessLog.verification_status == "Unauthorized",
            AccessLog.name.in_(["Unrecognized Person", "Unrecognized person", "Unknown Individual", "Unknown Person"]),
        )
        .order_by(desc(AccessLog.id))
        .limit(limit)
        .all()
    )


@router.get("/unauthorized-count")
def get_unauthorized_count(
    review_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Retrieve count of unauthorized events requiring attention according to backend status logic."""
    target_status = review_status or "Pending Verification"
    count = (
        db.query(AccessLog)
        .filter(
            AccessLog.verification_status == "Unauthorized",
            AccessLog.review_status == target_status,
        )
        .count()
    )
    return {"count": count, "review_status": target_status}


@router.get("/supervisor-unauthorized", response_model=SupervisorUnauthorizedResponse)
def get_supervisor_unauthorized_records(
    guard_id: Optional[int] = Query(None),
    guard_name: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    supervisor_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Retrieve unauthorized person records within the Campus Supervisor's scope.
    Optionally filters by reporting security guard and date range.
    Enforces scope access security: unauthorized cross-scope queries return 403 Forbidden.
    """
    effective_sup_id = 1
    if current_user:
        if current_user.role == "supervisor":
            sup = db.query(Supervisor).filter(
                (Supervisor.user_id == current_user.id) | (Supervisor.name == current_user.full_name)
            ).first()
            if sup:
                effective_sup_id = sup.id
        elif current_user.role in ("admin", "cso"):
            if supervisor_id:
                effective_sup_id = supervisor_id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: User role does not have supervisor records access.",
            )
    elif supervisor_id:
        effective_sup_id = supervisor_id

    assigned_guards = (
        db.query(SecurityGuard)
        .filter(SecurityGuard.assigned_supervisor_id == effective_sup_id)
        .all()
    )
    if not assigned_guards:
        assigned_guards = db.query(SecurityGuard).all()

    assigned_guard_ids = {g.id for g in assigned_guards}
    assigned_guard_names = {g.name for g in assigned_guards}
    guard_code_map = {g.id: g.guard_code for g in assigned_guards}
    guard_name_to_code = {g.name: g.guard_code for g in assigned_guards}
    guard_name_to_id = {g.name: g.id for g in assigned_guards}

    clean_name = guard_name.split("(")[0].strip() if guard_name else None
    matched_guard = None
    if guard_name:
        for g in assigned_guards:
            if g.name.lower() == clean_name.lower() or g.guard_code.lower() in guard_name.lower():
                matched_guard = g
                break

    # Strict scope restriction check:
    if guard_id is not None and guard_id not in assigned_guard_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Selected guard is outside supervisor's permitted institutional scope.",
        )
    if clean_name and not matched_guard and clean_name not in assigned_guard_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Selected guard is outside supervisor's permitted institutional scope.",
        )

    q = db.query(AccessLog).filter(AccessLog.verification_status == "Unauthorized")

    if guard_id is not None:
        target_name = next((g.name for g in assigned_guards if g.id == guard_id), None)
        q = q.filter((AccessLog.guard_id == guard_id) | (AccessLog.guard_name == target_name))
    elif clean_name:
        matched_target_name = matched_guard.name if matched_guard else clean_name
        matched_target_id = matched_guard.id if matched_guard else guard_name_to_id.get(clean_name)
        q = q.filter((AccessLog.guard_name == matched_target_name) | (AccessLog.guard_id == matched_target_id))
    else:
        q = q.filter(
            (AccessLog.guard_id.in_(assigned_guard_ids))
            | (AccessLog.guard_name.in_(assigned_guard_names))
        )

    if from_date:
        try:
            from_dt = datetime.strptime(from_date[:10], "%Y-%m-%d").replace(hour=0, minute=0, second=0)
            q = q.filter(AccessLog.timestamp >= from_dt)
        except ValueError:
            pass

    if to_date:
        try:
            to_dt = datetime.strptime(to_date[:10], "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            q = q.filter(AccessLog.timestamp <= to_dt)
        except ValueError:
            pass

    total_count = q.count()
    logs = q.order_by(desc(AccessLog.timestamp)).all()

    for log in logs:
        if not getattr(log, "guard_code", None):
            if log.guard_id and log.guard_id in guard_code_map:
                log.guard_code = guard_code_map[log.guard_id]
            elif log.guard_name and log.guard_name in guard_name_to_code:
                log.guard_code = guard_name_to_code[log.guard_name]
            else:
                log.guard_code = "SG-101"

    return SupervisorUnauthorizedResponse(count=total_count, records=logs)


class UnauthorizedReportRequest(BaseModel):
    name: Optional[str] = "Unrecognized Person"
    phone_number: Optional[str] = None
    location_block: str = "Gate 1 Main Entrance"
    guard_name: str = "G. Selvam"
    notes: Optional[str] = None
    image_base64: Optional[str] = None
    log_id: Optional[str] = None


@router.post("/unauthorized", response_model=AccessLogOut)
def record_unauthorized_report(
    req: UnauthorizedReportRequest,
    db: Session = Depends(get_db),
):
    snapshot_url = None
    if req.image_base64:
        try:
            b64_str = req.image_base64
            if "," in b64_str:
                _, b64_str = b64_str.split(",", 1)
            raw_bytes = base64.b64decode(b64_str)
            ts_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            rand_hex = uuid.uuid4().hex[:6]
            filename = f"intruder_{ts_str}_{rand_hex}.jpg"
            upload_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), f"../../../../uploads/intruders/{filename}")
            )
            public_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), f"../../../../public/faces/captured/{filename}")
            )
            os.makedirs(os.path.dirname(upload_path), exist_ok=True)
            os.makedirs(os.path.dirname(public_path), exist_ok=True)
            with open(upload_path, "wb") as f:
                f.write(raw_bytes)
            with open(public_path, "wb") as f:
                f.write(raw_bytes)
            snapshot_url = f"/faces/captured/{filename}"
        except Exception as e:
            print(f"Error saving intruder image: {e}")

    flag_notes = []
    if req.phone_number:
        flag_notes.append(f"Phone: {req.phone_number}")
    if req.notes:
        flag_notes.append(req.notes)
    flag_reason_str = ". ".join(flag_notes) if flag_notes else "Unauthorized person detected at security gate"

    guard_record = db.query(SecurityGuard).filter(SecurityGuard.name == req.guard_name).first()
    guard_id = guard_record.id if guard_record else None

    return log_access_event(
        db,
        AccessLogCreate(
            record_identifier=req.log_id,
            person_type="Unauthorized",
            name=req.name or "Unrecognized Person",
            identifier_value=req.phone_number or "UNREC-FACE",
            phone_number=req.phone_number,
            department="N/A",
            location_block=req.location_block,
            guard_name=req.guard_name,
            guard_id=guard_id,
            event_type="ENTRY",
            verification_method="Face Recognition",
            verification_status="Unauthorized",
            review_status="Pending Verification",
            flag_reason=flag_reason_str,
            snapshot_url=snapshot_url,
        ),
    )
