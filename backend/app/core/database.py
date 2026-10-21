import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# If running SQLite in test/dev, enable check_same_thread=False
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

fallback_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../campus_secure_dev.db"))
fallback_url = f"sqlite:///{fallback_db_path}"

engine = None
if settings.DATABASE_URL.startswith("postgresql"):
    try:
        temp_engine = create_engine(
            settings.DATABASE_URL,
            connect_args=connect_args,
            pool_pre_ping=True,
        )
        with temp_engine.connect() as conn:
            pass
        engine = temp_engine
    except Exception as e:
        print(f"[Database] PostgreSQL at '{settings.DATABASE_URL}' is unreachable: {e}")
        print(f"[Database] Falling back to SQLite database at '{fallback_url}' for local development & testing.")
        engine = create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()



def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
