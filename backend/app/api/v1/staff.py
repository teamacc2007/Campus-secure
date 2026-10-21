from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.staff import StaffOut, StaffCreate
from app.services.staff_service import (
    get_staff_by_employee_id,
    search_staff,
    create_staff,
)
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/staff", tags=["Staff"])


@router.get("/", response_model=List[StaffOut])
def list_staff_endpoint(
    query: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_staff(db, query=query, department=department, skip=skip, limit=limit)


@router.get("/by-employee-id/{employee_id}", response_model=StaffOut)
def get_staff_by_id_endpoint(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    staff = get_staff_by_employee_id(db, employee_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    return staff


@router.post("/", response_model=StaffOut)
def create_staff_endpoint(
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = get_staff_by_employee_id(db, staff_in.employee_id)
    if existing:
        raise HTTPException(status_code=400, detail="Staff employee ID already exists.")
    return create_staff(db, staff_in)
