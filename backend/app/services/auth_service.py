from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.schemas.auth import Token


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    
    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def generate_user_tokens(user: User) -> Token:
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        extra_claims={
            "username": user.username,
            "full_name": user.full_name,
            "institution_id": user.institution_id,
        },
    )
    refresh_token = create_refresh_token(subject=user.id, role=user.role)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
    )
