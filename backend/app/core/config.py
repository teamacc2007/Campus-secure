import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Campus Secure API"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # Security
    SECRET_KEY: str = "secret-key-campus-secure-2026-production-salt-key-do-not-leak"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/campus_secure",
    )

    # Storage
    STORAGE_BACKEND: str = "local"  # "local" or "minio"
    LOCAL_STORAGE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads"))
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "campus-secure"

    # Firebase
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None

    # AI Models
    FACE_DETECTION_MODEL_PATH: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../../ai/models/face_detection_yunet_2023mar.onnx")
    )
    FACE_RECOGNITION_MODEL_PATH: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../../ai/models/face_recognition_sface_2021dec.onnx")
    )
    FACE_MATCH_THRESHOLD: float = 0.65
    LIVENESS_THRESHOLD: float = 0.75

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:8443",
        "http://localhost:3000",
        "http://localhost:5173",
        "*",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
