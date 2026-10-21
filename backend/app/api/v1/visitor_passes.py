from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.visitor_pass import VisitorPassDraft, VisitorPassOut, VisitorPassCancel
from app.services.visitor_service import (
    create_visitor_pass,
    get_visitor_pass_by_id,
    get_visitor_pass_by_number,
    list_visitor_passes,
    cancel_visitor_pass,
)
from app.api.deps import get_current_user, require_roles
from app.models.user import User

router = APIRouter(prefix="/visitor-passes", tags=["Visitor Passes"])


@router.get("/", response_model=List[VisitorPassOut])
def list_passes(
    query: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    is_bulk: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_visitor_passes(
        db,
        query=query,
        status=status,
        is_bulk=is_bulk,
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=VisitorPassOut, status_code=status.HTTP_201_CREATED)
def create_pass(
    draft: VisitorPassDraft,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["access-supervisor", "supervisor", "admin", "security"])),
):
    return create_visitor_pass(db, draft, created_by=current_user.full_name)


@router.get("/{pass_id}", response_model=VisitorPassOut)
def get_pass_details(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pass_record = get_visitor_pass_by_id(db, pass_id)
    if not pass_record:
        raise HTTPException(status_code=404, detail="Visitor pass not found.")
    return pass_record


@router.get("/by-number/{pass_number}", response_model=VisitorPassOut)
def get_pass_by_number_endpoint(
    pass_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pass_record = get_visitor_pass_by_number(db, pass_number)
    if not pass_record:
        raise HTTPException(status_code=404, detail="Visitor pass not found.")
    return pass_record


@router.post("/{pass_id}/cancel", response_model=VisitorPassOut)
def cancel_pass_endpoint(
    pass_id: int,
    cancel_data: VisitorPassCancel,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["access-supervisor", "supervisor", "admin"])),
):
    try:
        return cancel_visitor_pass(
            db,
            pass_id=pass_id,
            cancel_data=cancel_data,
            cancelled_by=current_user.full_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
