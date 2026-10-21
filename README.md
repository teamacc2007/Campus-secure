# Campus Secure - Mobile Application & Enterprise Backend

An identity-led, real-time campus access control and security system built for **Trichy SRM Medical College Hospital & Research Centre**.

Developed with:
* **Mobile Application:** Flutter & Dart (reproducing the exact, final, and locked Figma mobile design specifications with zero visual alterations).
* **Backend:** Python 3.12 with FastAPI, Uvicorn, SQLAlchemy 2.x, and Alembic migrations.
* **Database:** PostgreSQL 16 (with SQLite development fallback).
* **AI & Biometrics:** YuNet/Haar Face Detection, ArcFace ONNX Face Recognition, Vector Matching, and Passive Anti-Spoof Liveness Detection.
* **Containerization:** Docker & Docker Compose.

---

## 🏛️ Roles Supported
1. **Security Guard (`security`):** Live face & register ID verification, entry/exit logging, and unauthorized attempt reporting.
2. **Campus Supervisor (`supervisor`):** Shift assignments, guard oversight, incident alert reviews, and audit trails.
3. **Access Supervisor (`access`):** Single visitor pass issuance, bulk XLSX student entry, pass records search, and reason-mandated cancellation.
4. **Hostel Warden (`warden`):** Student residence verification and hostel entry logs.
5. **Faculty / Staff (`staff`):** Departmental identification and student activity tracking.
6. **Student Affairs (`students`):** Student verification records and workload.
7. **Student Welfare (`welfare`):** Block movement and hostel activity monitoring.
8. **System Administrator (`admin`):** User management, supervisor assignments, and system audit logs.
9. **Chief Security Officer (`cso`):** Institution-wide security analytics, entry oversight, and alert tracking.
10. **Institute Manager (`manager`):** Campus-wide attendance and user directory overview.

Demo credentials: Password is **`12345`** for any role username.

---

## 📁 Repository Structure
```text
Campus-secure/
├── mobile/             # Flutter mobile application (Figma pixel-perfect UI)
│   ├── lib/
│   │   ├── config/     # Colors, typography, and themes
│   │   ├── services/   # REST API & Face verification service
│   │   ├── widgets/    # TopBar, BottomNav, StatusBadge, AppButton
│   │   ├── screens/    # All 27 Figma mobile screens
│   │   └── main.dart   # App entrypoint and navigator
│   └── pubspec.yaml    # Dependencies and assets
├── backend/            # FastAPI REST backend
│   ├── app/
│   │   ├── api/v1/     # REST routers (Auth, Passes, Logs, AI, Users)
│   │   ├── core/       # Config, database engine, JWT security
│   │   ├── models/     # SQLAlchemy 2.x declarative models
│   │   ├── schemas/    # Pydantic validation schemas
│   │   └── services/   # Business logic (Passes, Excel, Biometrics)
│   └── requirements.txt# Pinned Python 3.12 dependencies
├── ai/                 # Computer vision & face biometrics
│   ├── detector.py     # YuNet & OpenCV face detection
│   ├── embedder.py     # ArcFace / ONNX Runtime feature extraction
│   ├── matcher.py      # Cosine similarity & threshold classification
│   ├── liveness.py     # Anti-spoofing presentation attack evaluator
│   └── evaluator.py    # Latency and throughput benchmark
├── database/           # Migrations & database seeding
│   ├── alembic/        # Alembic migrations
│   └── seed_data.py    # Initial demo data & accounts
├── deployment/         # Production deployment
│   ├── Dockerfile.backend
│   ├── docker-compose.yml
│   └── nginx.conf
├── tests/              # Automated test suite (13 passing tests)
│   ├── backend/        # Auth, Visitor passes, Bulk import, Logs
│   └── ai/             # AI pipeline, embedding, liveness tests
├── docs/               # System documentation
│   ├── architecture.md
│   ├── api_documentation.md
│   ├── installation.md
│   └── security_and_privacy.md
├── src/                # Locked Figma Make React preview
├── .env.example
└── README.md
```

---

## 🚀 Quick Start

### 1. Start FastAPI Backend & Database
```bash
# Activate virtual environment
.\backend\venv\Scripts\Activate.ps1

# Seed database with demo data
python database/seed_data.py

# Run API server
uvicorn app.main:app --app-dir backend --reload --port 8000
```
Interactive API documentation: `http://localhost:8000/api/v1/docs`

### 2. Run Automated Test Suite
```bash
.\backend\venv\Scripts\pytest.exe tests/ -v
```

### 3. Run Flutter Mobile Application
```bash
cd mobile
flutter pub get
flutter run
```
*(The original Figma Make live preview also remains running on port 8443 at `http://localhost:8443`.)*

---

## 🔒 Security & Biometrics
* **Zero Raw Photo Storage:** Enrolled identities store only mathematical face embedding vectors.
* **Non-Destructive Audit Trail:** Visitor pass cancellations require a documented operational justification; records and timestamps are preserved immutably.
