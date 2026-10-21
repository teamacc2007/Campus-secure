from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.guard import SecurityGuard, Supervisor
from app.schemas.guard import GuardOut, GuardCreate, GuardUpdate, SupervisorOut
from app.api.deps import get_current_user, require_roles
from app.models.user import User

router = APIRouter(prefix="/guards", tags=["Guards & Supervisors"])


@router.get("/", response_model=List[GuardOut])
def list_guards(
    supervisor_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(SecurityGuard)
    if supervisor_id:
        q = q.filter(SecurityGuard.assigned_supervisor_id == supervisor_id)
    if status:
        q = q.filter(SecurityGuard.status == status)
    return q.all()


@router.post("/", response_model=GuardOut)
def create_guard(
    guard_in: GuardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["supervisor", "admin"])),
):
    existing = db.query(SecurityGuard).filter(SecurityGuard.guard_code == guard_in.guard_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Guard code already registered.")

    guard = SecurityGuard(**guard_in.model_dump())
    db.add(guard)
    db.commit()
    db.refresh(guard)
    return guard


@router.patch("/{guard_id}", response_model=GuardOut)
def update_guard(
    guard_id: int,
    guard_update: GuardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["supervisor", "admin"])),
):
    guard = db.query(SecurityGuard).filter(SecurityGuard.id == guard_id).first()
    if not guard:
        raise HTTPException(status_code=404, detail="Guard not found.")

    update_data = guard_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(guard, field, value)

    db.commit()
    db.refresh(guard)
    return guard


@router.get("/supervisors", response_model=List[SupervisorOut])
def list_supervisors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Supervisor).all()
