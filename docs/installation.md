# Campus Secure - Installation & Setup Guide

## System Requirements
* Python 3.12+
* Node.js v20+
* Flutter SDK (3.19+)
* Docker & Docker Compose (optional for containerized deployment)
* PostgreSQL 16+

---

## 1. Backend Setup (FastAPI & Python 3.12)

```bash
# Navigate to repository root
cd Campus-secure

# Create and activate virtual environment
python -m venv backend/venv

# Windows Powershell
.\backend\venv\Scripts\Activate.ps1

# Linux / macOS
source backend/venv/bin/activate

# Install pinned dependencies
pip install -r backend/requirements.txt

# Run database migrations / seed demo data
python database/seed_data.py

# Start FastAPI development server
uvicorn app.main:app --app-dir backend --reload --port 8000
```

Interactive API documentation will be available at:
👉 `http://localhost:8000/api/v1/docs`

---

## 2. Running Automated Tests

```bash
.\backend\venv\Scripts\pytest.exe tests/ -v
```

All 13 integration, AI pipeline, authentication, and visitor pass tests will execute.

---

## 3. Flutter Mobile Application Setup

```bash
cd mobile

# Fetch Flutter dependencies
flutter pub get

# Run on connected mobile device or emulator
flutter run
```

---

## 4. Docker Deployment

```bash
cd deployment

# Start PostgreSQL 16, Redis, MinIO, and FastAPI Backend
docker compose up -d --build
```
