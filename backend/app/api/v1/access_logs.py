import os
import uuid
import base64
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.access_log import AccessLogOut, AccessLogCreate, AccessLogReviewRequest
from app.services.access_log_service import (
    log_access_event,
    list_access_logs,
    review_access_log,
)
from app.api.deps import get_current_user, require_roles
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


class UnauthorizedReportRequest(BaseModel):
    name: Optional[str] = "Unrecognized Person"
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

    return log_access_event(
        db,
        AccessLogCreate(
            record_identifier=req.log_id,
            person_type="Unauthorized",
            name=req.name or "Unrecognized Person",
            identifier_value="UNREC-FACE",
            department="N/A",
            location_block=req.location_block,
            guard_name=req.guard_name,
            event_type="ENTRY",
            verification_method="Face Recognition",
            verification_status="Unauthorized",
            review_status="Pending Verification",
            flag_reason=req.notes or "Unauthorized person detected at security gate",
            snapshot_url=snapshot_url,
        ),
    )
