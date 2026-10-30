from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.guard import SecurityGuard, Supervisor
from app.schemas.guard import GuardOut, GuardCreate, GuardUpdate, SupervisorOut
from app.api.deps import get_current_user, get_current_user_optional, require_roles
from app.models.user import User

router = APIRouter(prefix="/guards", tags=["Guards & Supervisors"])


@router.get("/", response_model=List[GuardOut])
def list_guards(
    supervisor_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    q = db.query(SecurityGuard)
    if current_user and current_user.role == "supervisor":
        sup = db.query(Supervisor).filter(
            (Supervisor.user_id == current_user.id) | (Supervisor.name == current_user.full_name)
        ).first()
        effective_sup_id = sup.id if sup else 1
        if supervisor_id and supervisor_id != effective_sup_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot query guards outside your assigned supervisor scope.",
            )
        q = q.filter(SecurityGuard.assigned_supervisor_id == effective_sup_id)
    elif supervisor_id:
        q = q.filter(SecurityGuard.assigned_supervisor_id == supervisor_id)

    if status:
        q = q.filter(SecurityGuard.status == status)
    return q.all()


@router.get("/assigned", response_model=List[GuardOut])
def list_assigned_guards(
    supervisor_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Retrieve security guards assigned to the Campus Supervisor's institution/scope."""
    effective_sup_id = 1
    if current_user and current_user.role == "supervisor":
        sup = db.query(Supervisor).filter(
            (Supervisor.user_id == current_user.id) | (Supervisor.name == current_user.full_name)
        ).first()
        if sup:
            effective_sup_id = sup.id
    elif supervisor_id:
        effective_sup_id = supervisor_id

    guards = (
        db.query(SecurityGuard)
        .filter(SecurityGuard.assigned_supervisor_id == effective_sup_id)
        .order_by(SecurityGuard.id)
        .all()
    )
    if not guards:
        guards = db.query(SecurityGuard).order_by(SecurityGuard.id).all()
    return guards


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
