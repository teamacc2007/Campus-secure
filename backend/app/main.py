import os
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

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    description="Campus Security Mobile Application Backend API - Trichy SRM Medical College Hospital & Research Centre",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
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
        "institution": "Trichy SRM Medical College Hospital & Research Centre",
        "documentation": f"{settings.API_V1_STR}/docs",
    }
