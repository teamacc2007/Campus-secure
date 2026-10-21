from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


def get_student_by_id(db: Session, student_id: int) -> Optional[Student]:
    return db.query(Student).filter(Student.id == student_id).first()


def get_student_by_register_number(db: Session, register_number: str) -> Optional[Student]:
    return db.query(Student).filter(Student.register_number.ilike(register_number.strip())).first()


def search_students(
    db: Session,
    query: Optional[str] = None,
    department: Optional[str] = None,
    residence_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Student]:
    q = db.query(Student)
    if query:
        term = f"%{query.strip()}%"
        q = q.filter((Student.name.ilike(term)) | (Student.register_number.ilike(term)))
    if department and department != "All":
        q = q.filter(Student.department == department)
    if residence_type and residence_type != "All":
        q = q.filter(Student.residence_type == residence_type)
    return q.offset(skip).limit(limit).all()


def create_student(db: Session, student_in: StudentCreate) -> Student:
    student = Student(**student_in.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student
