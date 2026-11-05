from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import re
from sqlalchemy.orm import Session
from app.models.student import Student, AccommodationHistory
from app.schemas.student import StudentCreate, StudentUpdate, AccommodationUpdateRequest


def get_student_by_id(db: Session, student_id: int) -> Optional[Student]:
    return db.query(Student).filter(Student.id == student_id).first()


def get_student_by_register_number(db: Session, register_number: str) -> Optional[Student]:
    return db.query(Student).filter(Student.register_number.ilike(register_number.strip())).first()


def search_students(
    db: Session,
    query: Optional[str] = None,
    department: Optional[str] = None,
    residence_type: Optional[str] = None,
    institution_id: Optional[int] = None,
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
    if institution_id:
        q = q.filter(Student.institution_id == institution_id)
    return q.offset(skip).limit(limit).all()


def create_student(db: Session, student_in: StudentCreate) -> Student:
    student = Student(**student_in.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def get_student_accommodation(db: Session, register_number: str) -> Optional[Dict[str, Any]]:
    student = get_student_by_register_number(db, register_number)
    if not student:
        return None

    # Retrieve accommodation history
    histories = (
        db.query(AccommodationHistory)
        .filter(AccommodationHistory.student_id == student.id)
        .order_by(AccommodationHistory.id.desc())
        .all()
    )

    norm_type = student.residence_type or "Hosteller"
    if norm_type.lower() == "hostel":
        norm_type = "Hosteller"

    return {
        "register_number": student.register_number,
        "name": student.name,
        "department": student.department,
        "year_roman": student.year_roman or "II Year",
        "batch": student.batch or "2023–2028",
        "program": f"{student.department} · {student.year_roman or 'II Year'}",
        "photo_url": student.photo_url or "/faces/sur_crop.jpg",
        "residence_type": norm_type,
        "hostel_name": student.hostel_name,
        "hostel_block": student.hostel_block,
        "room_number": student.room_number,
        "hostel_address": student.hostel_address,
        "pg_name": student.pg_name,
        "pg_address": student.pg_address,
        "pg_contact": student.pg_contact,
        "distance_from_campus": student.distance_from_campus,
        "residential_address": student.residential_address,
        "contact_number": student.contact_number,
        "phone_number": getattr(student, "phone_number", None) or student.contact_number or getattr(student, "pg_contact", None) or None,
        "transportation_type": student.transportation_type,
        "bus_route": student.bus_route,
        "bus_boarding_point": student.bus_boarding_point,
        "vehicle_type": student.vehicle_type,
        "vehicle_number": student.vehicle_number,
        "transport_description": student.transport_description,
        "accommodation_notes": student.accommodation_notes,
        "residence_updated_at": student.residence_updated_at,
        "residence_updated_by": student.residence_updated_by,
        "history": histories,
    }


def update_student_accommodation(
    db: Session,
    register_number: str,
    data: AccommodationUpdateRequest,
) -> Dict[str, Any]:
    student = get_student_by_register_number(db, register_number)
    if not student:
        raise ValueError(f"Student with register number {register_number} not found.")

    # 1. Normalize residence type
    raw_type = (data.residence_type or "").strip()
    if raw_type.lower() in ("hostel", "hosteller"):
        norm_type = "Hosteller"
    elif raw_type.lower() == "pg":
        norm_type = "PG"
    elif raw_type.lower() in ("dayscholar", "day scholar"):
        norm_type = "Day Scholar"
    else:
        raise ValueError("Invalid residence type. Must be Hosteller, PG, or Day Scholar.")

    # 2. Validation based on residence type
    if norm_type == "Hosteller":
        if not data.hostel_name or not data.hostel_name.strip():
            raise ValueError("Hostel name is required.")
        if not data.room_number or not data.room_number.strip():
            raise ValueError("Room number is required.")

    elif norm_type == "PG":
        if not data.pg_name or not data.pg_name.strip():
            raise ValueError("PG name is required.")
        if not data.pg_address or not data.pg_address.strip():
            raise ValueError("Complete PG address is required.")
        if not data.pg_contact or not data.pg_contact.strip():
            raise ValueError("Contact number is required.")
        clean_phone = re.sub(r"[\s\-]", "", data.pg_contact.strip())
        is_valid_phone = bool(
            re.match(r"^(?:\+?91)?[6-9]\d{9}$", clean_phone)
            or re.match(r"^\+?[1-9]\d{9,14}$", clean_phone)
        )
        if not is_valid_phone:
            raise ValueError("Please enter a valid 10-digit mobile or international contact number.")

    elif norm_type == "Day Scholar":
        if not data.residential_address or not data.residential_address.strip():
            raise ValueError("Complete residential address is required.")
        if not data.contact_number or not data.contact_number.strip():
            raise ValueError("Contact number is required.")
        clean_phone = re.sub(r"[\s\-]", "", data.contact_number.strip())
        is_valid_phone = bool(
            re.match(r"^(?:\+?91)?[6-9]\d{9}$", clean_phone)
            or re.match(r"^\+?[1-9]\d{9,14}$", clean_phone)
        )
        if not is_valid_phone:
            raise ValueError("Please enter a valid 10-digit mobile or international contact number.")
        if not data.transportation_type or not data.transportation_type.strip():
            raise ValueError("Transportation type is required.")

    # 3. Snapshot previous accommodation details
    prev_type = student.residence_type or "Hosteller"
    if prev_type.lower() == "hostel":
        prev_type = "Hosteller"

    previous_details = {
        "residence_type": prev_type,
        "hostel_name": student.hostel_name,
        "hostel_block": student.hostel_block,
        "room_number": student.room_number,
        "hostel_address": student.hostel_address,
        "pg_name": student.pg_name,
        "pg_address": student.pg_address,
        "pg_contact": student.pg_contact,
        "distance_from_campus": student.distance_from_campus,
        "residential_address": student.residential_address,
        "contact_number": student.contact_number,
        "phone_number": getattr(student, "phone_number", None) or student.contact_number or getattr(student, "pg_contact", None) or None,
        "transportation_type": student.transportation_type,
        "bus_route": student.bus_route,
        "bus_boarding_point": student.bus_boarding_point,
        "vehicle_type": student.vehicle_type,
        "vehicle_number": student.vehicle_number,
        "transport_description": student.transport_description,
        "accommodation_notes": student.accommodation_notes,
    }

    # 4. Build new details snapshot
    new_details = {
        "residence_type": norm_type,
        "hostel_name": data.hostel_name.strip() if data.hostel_name else None,
        "hostel_block": data.hostel_block.strip() if data.hostel_block else None,
        "room_number": data.room_number.strip() if data.room_number else None,
        "hostel_address": data.hostel_address.strip() if data.hostel_address else None,
        "pg_name": data.pg_name.strip() if data.pg_name else None,
        "pg_address": data.pg_address.strip() if data.pg_address else None,
        "pg_contact": data.pg_contact.strip() if data.pg_contact else None,
        "distance_from_campus": data.distance_from_campus.strip() if data.distance_from_campus else None,
        "residential_address": data.residential_address.strip() if data.residential_address else None,
        "contact_number": data.contact_number.strip() if data.contact_number else None,
        "transportation_type": data.transportation_type.strip() if data.transportation_type else None,
        "bus_route": data.bus_route.strip() if data.bus_route else None,
        "bus_boarding_point": data.bus_boarding_point.strip() if data.bus_boarding_point else None,
        "vehicle_type": data.vehicle_type.strip() if data.vehicle_type else None,
        "vehicle_number": data.vehicle_number.strip() if data.vehicle_number else None,
        "transport_description": data.transport_description.strip() if data.transport_description else None,
        "accommodation_notes": data.notes.strip() if data.notes else None,
    }

    now_utc = datetime.now(timezone.utc)
    effective_date = data.effective_date or datetime.now().strftime("%d-%m-%Y")
    updated_by = data.updated_by or "Dr. Kavitha Rao"

    # 5. Insert history record
    history_record = AccommodationHistory(
        student_id=student.id,
        register_number=student.register_number,
        previous_residence_type=prev_type,
        previous_details=previous_details,
        new_residence_type=norm_type,
        new_details=new_details,
        effective_date=effective_date,
        updated_by=updated_by,
        updated_timestamp=now_utc,
    )
    db.add(history_record)

    # 6. Update student record
    student.residence_type = norm_type
    if norm_type == "Hosteller":
        student.hostel_name = data.hostel_name.strip() if data.hostel_name else None
        student.hostel_block = data.hostel_block.strip() if data.hostel_block else None
        student.room_number = data.room_number.strip() if data.room_number else None
        student.hostel_address = data.hostel_address.strip() if data.hostel_address else "Campus Hostel Zone, SRM Trichy"
        # Clear other types
        student.pg_name = None
        student.pg_address = None
        student.pg_contact = None
        student.distance_from_campus = None
    elif norm_type == "PG":
        student.pg_name = data.pg_name.strip() if data.pg_name else None
        student.pg_address = data.pg_address.strip() if data.pg_address else None
        student.pg_contact = data.pg_contact.strip() if data.pg_contact else None
        student.distance_from_campus = data.distance_from_campus.strip() if data.distance_from_campus else None
        # Clear hostel room specifics
        student.hostel_name = None
        student.hostel_block = None
        student.room_number = None
    elif norm_type == "Day Scholar":
        student.residential_address = data.residential_address.strip() if data.residential_address else None
        student.contact_number = data.contact_number.strip() if data.contact_number else None
        student.transportation_type = data.transportation_type.strip() if data.transportation_type else None
        student.bus_route = data.bus_route.strip() if data.bus_route else None
        student.bus_boarding_point = data.bus_boarding_point.strip() if data.bus_boarding_point else None
        student.vehicle_type = data.vehicle_type.strip() if data.vehicle_type else None
        student.vehicle_number = data.vehicle_number.strip() if data.vehicle_number else None
        student.transport_description = data.transport_description.strip() if data.transport_description else None
        # Clear hostel room specifics
        student.hostel_name = None
        student.hostel_block = None
        student.room_number = None

    if data.notes:
        student.accommodation_notes = data.notes.strip()

    student.residence_updated_at = now_utc
    student.residence_updated_by = updated_by

    db.commit()
    db.refresh(student)

    return get_student_accommodation(db, register_number)

