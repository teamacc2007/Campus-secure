from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffUpdate


def get_staff_by_id(db: Session, staff_id: int) -> Optional[Staff]:
    return db.query(Staff).filter(Staff.id == staff_id).first()


def get_staff_by_employee_id(db: Session, employee_id: str) -> Optional[Staff]:
    return db.query(Staff).filter(Staff.employee_id.ilike(employee_id.strip())).first()


def search_staff(
    db: Session,
    query: Optional[str] = None,
    department: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Staff]:
    q = db.query(Staff)
    if query:
        term = f"%{query.strip()}%"
        q = q.filter((Staff.name.ilike(term)) | (Staff.employee_id.ilike(term)))
    if department and department != "All":
        q = q.filter(Staff.department == department)
    return q.offset(skip).limit(limit).all()


def create_staff(db: Session, staff_in: StaffCreate) -> Staff:
    staff = Staff(**staff_in.model_dump())
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff
