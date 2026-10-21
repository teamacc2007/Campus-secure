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
