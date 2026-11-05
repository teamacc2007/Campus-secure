from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.student import (
    StudentOut,
    StudentCreate,
    AccommodationUpdateRequest,
    StudentAccommodationOut,
    AccommodationHistoryOut,
)
from app.services.student_service import (
    get_student_by_register_number,
    search_students,
    create_student,
    get_student_accommodation,
    update_student_accommodation,
)
from app.api.deps import get_current_user, get_current_user_optional
from app.models.user import User

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/", response_model=List[StudentOut])
def list_students_endpoint(
    query: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    residence_type: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    return search_students(
        db,
        query=query,
        department=department,
        residence_type=residence_type,
        institution_id=institution_id,
        skip=skip,
        limit=limit,
    )


@router.get("/accommodation/{register_number}", response_model=StudentAccommodationOut)
def get_accommodation_endpoint(
    register_number: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    res = get_student_accommodation(db, register_number)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with register number '{register_number}' not found.",
        )
    return res


@router.put("/accommodation/{register_number}", response_model=StudentAccommodationOut)
@router.post("/accommodation/{register_number}", response_model=StudentAccommodationOut)
def update_accommodation_endpoint(
    register_number: str,
    payload: AccommodationUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    try:
        updated_by = payload.updated_by
        if current_user and current_user.full_name:
            updated_by = current_user.full_name
        elif not updated_by:
            updated_by = "Dr. Kavitha Rao"
        payload.updated_by = updated_by

        return update_student_accommodation(db, register_number, payload)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


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

