import os
import sys

# Ensure repository root is on sys.path for ai and database imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.api import api_router

# Ensure local storage directory exists
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)

# Create database tables if not existing
Base.metadata.create_all(bind=engine)


def ensure_accommodation_columns():
    try:
        with engine.connect() as conn:
            new_cols = [
                ("hostel_block", "VARCHAR(100)"),
                ("hostel_address", "VARCHAR(255)"),
                ("pg_name", "VARCHAR(150)"),
                ("pg_address", "TEXT"),
                ("pg_contact", "VARCHAR(50)"),
                ("distance_from_campus", "VARCHAR(50)"),
                ("residential_address", "TEXT"),
                ("contact_number", "VARCHAR(50)"),
                ("phone_number", "VARCHAR(50)"),
                ("transportation_type", "VARCHAR(50)"),
                ("vehicle_type", "VARCHAR(50)"),
                ("transport_description", "VARCHAR(255)"),
                ("accommodation_notes", "TEXT"),
                ("residence_updated_at", "DATETIME"),
                ("residence_updated_by", "VARCHAR(100)"),
            ]
            if engine.url.drivername.startswith("sqlite"):
                res = conn.exec_driver_sql("PRAGMA table_info(students)").fetchall()
                existing_cols = {r[1] for r in res}
                for col_name, col_type in new_cols:
                    if col_name not in existing_cols:
                        conn.exec_driver_sql(f"ALTER TABLE students ADD COLUMN {col_name} {col_type}")

                phone_seeds = {
                    "23MED0412": "+91 98765 12041",
                    "23AHS0185": "+91 98765 12185",
                    "22ECE0531": "+91 98765 12531",
                    "22CSE0789": "+91 98765 12789",
                    "22MBBS041": "+91 98765 12042",
                    "23ECE0721": "+91 98765 12721",
                    "22CSE1048": "+91 98765 12048",
                    "21BPT019": "+91 98765 12019",
                    "24NUR005": "+91 98765 12005",
                }
                for reg, ph in phone_seeds.items():
                    conn.exec_driver_sql(
                        f"UPDATE students SET phone_number = '{ph}' WHERE register_number = '{reg}' AND (phone_number IS NULL OR phone_number = '')"
                    )
                conn.commit()
            elif "postgres" in engine.url.drivername:
                for col_name, col_type in new_cols:
                    try:
                        conn.exec_driver_sql(f"ALTER TABLE students ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
                    except Exception:
                        pass
                phone_seeds = {
                    "23MED0412": "+91 98765 12041",
                    "23AHS0185": "+91 98765 12185",
                    "22ECE0531": "+91 98765 12531",
                    "22CSE0789": "+91 98765 12789",
                    "22MBBS041": "+91 98765 12042",
                    "23ECE0721": "+91 98765 12721",
                    "22CSE1048": "+91 98765 12048",
                    "21BPT019": "+91 98765 12019",
                    "24NUR005": "+91 98765 12005",
                }
                for reg, ph in phone_seeds.items():
                    try:
                        conn.exec_driver_sql(
                            f"UPDATE students SET phone_number = '{ph}' WHERE register_number = '{reg}' AND (phone_number IS NULL OR phone_number = '')"
                        )
                    except Exception:
                        pass
                conn.commit()
    except Exception as e:
        print(f"[Migration] Accommodation columns check: {e}")


ensure_accommodation_columns()


def seed_default_users_if_empty():
    try:
        from app.core.database import SessionLocal
        from app.models.institution import Institution
        from app.models.user import User
        from app.core.security import get_password_hash

        with SessionLocal() as db:
            inst = db.query(Institution).filter(
                (Institution.short_code == "SRMTRICHY") | (Institution.short_code == "TSRMMCHRC")
            ).first()
            if not inst:
                inst = Institution(
                    name="SRM GROUP OF INSTITUTIONS TRICHY",
                    short_code="SRMTRICHY",
                    campus_code="SRM-TRICHY-01",
                    address="SRM Nagar, Irungalur, Tiruchirappalli, Tamil Nadu 621105",
                )
                db.add(inst)
                db.commit()
                db.refresh(inst)

            existing_users = {u.username.lower(): u for u in db.query(User).all()}
            demo_users = [
                ("admin", "A. Balaji", "admin", "admin@srmtrichy.edu.in", "9876543218"),
                ("manager", "Dr. M. Senthil", "manager", "manager@srmtrichy.edu.in", "9876543220"),
                ("security", "G. Selvam", "security", "security@srmtrichy.edu.in", "9876543210"),
                ("warden", "Dr. K. Raman", "warden", "warden@srmtrichy.edu.in", "9876543211"),
                ("staff", "Prof. S. Venkatesh", "staff", "staff@srmtrichy.edu.in", "9876543212"),
                ("supervisor", "M. Rajesh", "supervisor", "supervisor@srmtrichy.edu.in", "9876543213"),
                ("access", "P. Anitha", "access-supervisor", "access@srmtrichy.edu.in", "9876543214"),
                ("access-supervisor", "P. Anitha", "access-supervisor", "access-supervisor@srmtrichy.edu.in", "9876543215"),
                ("students", "Dr. V. Meenakshi", "students", "students@srmtrichy.edu.in", "9876543216"),
                ("welfare", "Dr. R. Karthik", "welfare", "welfare@srmtrichy.edu.in", "9876543217"),
                ("cso", "Col. R. Sundaram", "cso", "cso@srmtrichy.edu.in", "9876543219"),
            ]
            created = 0
            hp = get_password_hash("12345")
            for u_name, f_name, r, em, ph in demo_users:
                if u_name not in existing_users:
                    u = User(
                        username=u_name,
                        full_name=f_name,
                        role=r,
                        email=em,
                        phone=ph,
                        hashed_password=hp,
                        institution_id=inst.id,
                        is_active=True,
                    )
                    db.add(u)
                    created += 1
            if created > 0:
                db.commit()
                print(f"[Seed] Created {created} default role accounts.")
    except Exception as e:
        print(f"[Seed] Initial users seeding check: {e}")


seed_default_users_if_empty()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    description="Campus Security Mobile Application Backend API - SRM GROUP OF INSTITUTIONS TRICHY",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local media storage
app.mount("/media", StaticFiles(directory=settings.LOCAL_STORAGE_DIR), name="media")

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "connected",
        "storage": settings.STORAGE_BACKEND,
    }


@app.get("/", tags=["Root"])
def root_endpoint():
    return {
        "message": "Welcome to Campus Secure API",
        "institution": "SRM GROUP OF INSTITUTIONS TRICHY",
        "documentation": f"{settings.API_V1_STR}/docs",
    }
