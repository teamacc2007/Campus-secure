from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.student import StudentOut, StudentCreate
from app.services.student_service import (
    get_student_by_register_number,
    search_students,
    create_student,
)
from app.api.deps import get_current_user, get_current_user_optional
from app.models.user import User

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/", response_model=List[StudentOut])
def list_students_endpoint(
    query: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    residence_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_students(
        db,
        query=query,
        department=department,
        residence_type=residence_type,
        skip=skip,
        limit=limit,
    )


@router.get("/by-register/{register_number}", response_model=StudentOut)
def get_student_by_register_endpoint(
    register_number: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    student = get_student_by_register_number(db, register_number)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return student


@router.post("/", response_model=StudentOut)
def create_student_endpoint(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = get_student_by_register_number(db, student_in.register_number)
    if existing:
        raise HTTPException(status_code=400, detail="Student register number already exists.")
    return create_student(db, student_in)
