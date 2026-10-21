from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.visitor_pass import VisitorPass
from app.schemas.visitor_pass import VisitorPassDraft, VisitorPassCancel


def generate_next_pass_number(db: Session) -> str:
    current_year = datetime.now().year
    prefix = f"VP-{current_year}-"
    last_pass = (
        db.query(VisitorPass)
        .filter(VisitorPass.pass_number.like(f"{prefix}%"))
        .order_by(desc(VisitorPass.id))
        .first()
    )
    if not last_pass:
        return f"{prefix}0001"
    
    try:
        last_seq = int(last_pass.pass_number.replace(prefix, ""))
        next_seq = last_seq + 1
    except ValueError:
        next_seq = 1
    return f"{prefix}{next_seq:04d}"


def create_visitor_pass(
    db: Session,
    draft: VisitorPassDraft,
    created_by: str = "Access Supervisor",
) -> VisitorPass:
    pass_number = generate_next_pass_number(db)
    
    visitor_pass = VisitorPass(
        pass_number=pass_number,
        visitor_name=draft.visitor_name.strip(),
        visitor_phone=draft.visitor_phone.strip(),
        photo_url=draft.photo_url,
        purpose=draft.purpose.strip(),
        proof_document_url=draft.proof_document_url,
        event_name=draft.event_name.strip() if draft.event_name else None,
        event_purpose=draft.event_purpose.strip() if draft.event_purpose else None,
        start_date=draft.start_date.strip(),
        end_date=draft.end_date.strip(),
        accessible_blocks=draft.accessible_blocks,
        coordinator_name=draft.coordinator_name.strip(),
        coordinator_phone=draft.coordinator_phone.strip(),
        status="Active",
        is_bulk=draft.is_bulk,
        created_by=created_by,
        created_at=datetime.now(timezone.utc),
    )
    db.add(visitor_pass)
    db.commit()
    db.refresh(visitor_pass)
    return visitor_pass


def get_visitor_pass_by_id(db: Session, pass_id: int) -> Optional[VisitorPass]:
    return db.query(VisitorPass).filter(VisitorPass.id == pass_id).first()


def get_visitor_pass_by_number(db: Session, pass_number: str) -> Optional[VisitorPass]:
    return db.query(VisitorPass).filter(VisitorPass.pass_number == pass_number.strip()).first()


def list_visitor_passes(
    db: Session,
    query: Optional[str] = None,
    status: Optional[str] = None,
    is_bulk: Optional[bool] = None,
    skip: int = 0,
    limit: int = 200,
) -> List[VisitorPass]:
    q = db.query(VisitorPass)
    if query:
        term = f"%{query.strip()}%"
        q = q.filter(
            (VisitorPass.visitor_name.ilike(term))
            | (VisitorPass.pass_number.ilike(term))
            | (VisitorPass.coordinator_name.ilike(term))
            | (VisitorPass.purpose.ilike(term))
        )
    if status and status != "All":
        q = q.filter(VisitorPass.status == status)
    if is_bulk is not None:
        q = q.filter(VisitorPass.is_bulk == is_bulk)
    return q.order_by(desc(VisitorPass.id)).offset(skip).limit(limit).all()


def cancel_visitor_pass(
    db: Session,
    pass_id: int,
    cancel_data: VisitorPassCancel,
    cancelled_by: str,
) -> VisitorPass:
    pass_record = get_visitor_pass_by_id(db, pass_id)
    if not pass_record:
        raise ValueError("Visitor pass not found.")
    
    if pass_record.status == "Cancelled":
        raise ValueError("Pass is already cancelled.")

    # Preserve all original pass information, update status and cancellation audit
    pass_record.status = "Cancelled"
    pass_record.cancellation_reason = cancel_data.reason.strip()
    pass_record.cancelled_by = cancelled_by
    pass_record.cancelled_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(pass_record)
    return pass_record
