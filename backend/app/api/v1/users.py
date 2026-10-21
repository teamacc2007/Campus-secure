from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserOut, UserCreate, UserUpdate
from app.core.security import get_password_hash
from app.api.deps import require_roles, get_current_user

router = APIRouter(prefix="/users", tags=["User Administration"])


@router.get("/", response_model=List[UserOut])
def list_users(
    role: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "manager", "cso"])),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if institution_id:
        q = q.filter(User.institution_id == institution_id)
    return q.all()


@router.post("/", response_model=UserOut)
def create_new_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists.")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        role=user_in.role,
        phone=user_in.phone,
        is_active=user_in.is_active,
        institution_id=user_in.institution_id,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/{user_id}", response_model=UserOut)
def update_user_endpoint(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_dict = user_update.model_dump(exclude_unset=True)
    if "password" in update_dict:
        raw_password = update_dict.pop("password")
        if raw_password:
            user.hashed_password = get_password_hash(raw_password)

    for field, val in update_dict.items():
        setattr(user, field, val)

    db.commit()
    db.refresh(user)
    return user
