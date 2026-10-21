import base64
import json
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.ai import (
    FaceVerifyRequest,
    FaceVerifyResponse,
    MatchedPerson,
    LivenessCheckResult,
)
from app.models.student import Student
from app.models.staff import Staff
from app.models.access_log import AccessLog
from app.services.access_log_service import log_access_event
from app.schemas.access_log import AccessLogCreate
from app.api.deps import get_current_user
from app.models.user import User

from ai.detector import FaceDetector
from ai.embedder import FaceEmbedder
from ai.matcher import FaceMatcher
from ai.liveness import LivenessEvaluator

router = APIRouter(prefix="/ai", tags=["AI & Biometrics"])

detector = FaceDetector()
embedder = FaceEmbedder()
matcher = FaceMatcher(match_threshold=0.68, uncertain_threshold=0.50)
liveness_evaluator = LivenessEvaluator()


def decode_base64_image(base64_str: str) -> np.ndarray:
    if "," in base64_str:
        base64_str = base64_str.split(",", 1)[1]
    img_bytes = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


@router.post("/verify-face", response_model=FaceVerifyResponse)
def verify_face_endpoint(
    req: FaceVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if direct register_number fallback was provided
    if req.register_number:
        student = db.query(Student).filter(Student.register_number == req.register_number.strip()).first()
        if student:
            # Log successful access
            log_access_event(
                db,
                AccessLogCreate(
                    person_type="Student",
                    name=student.name,
                    identifier_value=student.register_number,
                    department=student.department,
                    location_block=req.location_block,
                    guard_name=req.guard_name or current_user.full_name,
                    event_type="ENTRY",
                    verification_method="Register ID",
                    verification_status="Authorized",
                    review_status="Verified",
                    student_id=student.id,
                ),
            )
            return FaceVerifyResponse(
                success=True,
                is_recognized=True,
                is_live=True,
                verification_status="Authorized",
                similarity_score=1.0,
                matched_person=MatchedPerson(
                    person_type="student",
                    identifier=student.register_number,
                    name=student.name,
                    initials=student.initials,
                    department=student.department,
                    year_roman=student.year_roman,
                    batch=student.batch,
                    residence_type=student.residence_type,
                    hostel_name=student.hostel_name,
                    room_number=student.room_number,
                    photo_url=student.photo_url,
                    similarity_score=1.0,
                ),
                message="Identity verified via Register ID lookup.",
            )

    # Process image if provided
    probe_img = None
    if req.image_base64:
        try:
            probe_img = decode_base64_image(req.image_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image data.")

    if probe_img is None:
        raise HTTPException(status_code=400, detail="Neither image data nor register number was provided.")

    # 1. Face detection
    faces = detector.detect_faces(probe_img)
    if not faces:
        return FaceVerifyResponse(
            success=False,
            is_recognized=False,
            is_live=False,
            verification_status="Unauthorized",
            similarity_score=0.0,
            message="No face detected in the camera frame.",
        )

    # Pick the largest face
    primary_face = max(faces, key=lambda f: f["box"][2] * f["box"][3])
    x, y, w, h = primary_face["box"]
    # Ensure crop within bounds
    ih, iw = probe_img.shape[:2]
    x1, y1 = max(0, x), max(0, y)
    x2, y2 = min(iw, x + w), min(ih, y + h)
    face_crop = probe_img[y1:y2, x1:x2]

    # 2. Liveness Evaluation
    liveness_res = liveness_evaluator.evaluate(face_crop)
    if not liveness_res["is_live"]:
        # Log unauthorized attempt due to presentation attack
        log_access_event(
            db,
            AccessLogCreate(
                person_type="Unauthorized",
                name="Unknown Individual",
                identifier_value="SPOOF-ALERT",
                department="N/A",
                location_block=req.location_block,
                guard_name=req.guard_name or current_user.full_name,
                event_type="ENTRY",
                verification_method="Face Recognition",
                verification_status="Unauthorized",
                review_status="Unauthorised",
                flag_reason="Liveness anti-spoofing check failed (possible print/screen attack)",
            ),
        )
        return FaceVerifyResponse(
            success=False,
            is_recognized=False,
            is_live=False,
            verification_status="Unauthorized",
            similarity_score=0.0,
            liveness_details=LivenessCheckResult(**liveness_res),
            message="Liveness check failed. Potential presentation attack detected.",
        )

    # 3. Extract Probe Embedding
    probe_embedding = embedder.extract_embedding(face_crop)

    # 4. Build Gallery from enrolled Students and Staff
    enrolled_students = db.query(Student).filter(Student.is_active == True).all()
    gallery = []
    for s in enrolled_students:
        emb = None
        if s.face_embedding:
            try:
                emb = json.loads(s.face_embedding)
            except Exception:
                pass
        gallery.append({
            "type": "student",
            "id": s.id,
            "identifier": s.register_number,
            "name": s.name,
            "initials": s.initials,
            "department": s.department,
            "year_roman": s.year_roman,
            "batch": s.batch,
            "residence_type": s.residence_type,
            "hostel_name": s.hostel_name,
            "room_number": s.room_number,
            "photo_url": s.photo_url,
            "embedding": emb,
        })

    enrolled_staff = db.query(Staff).filter(Staff.is_active == True).all()
    for st in enrolled_staff:
        emb = None
        if st.face_embedding:
            try:
                emb = json.loads(st.face_embedding)
            except Exception:
                pass
        gallery.append({
            "type": "staff",
            "id": st.id,
            "identifier": st.employee_id,
            "name": st.name,
            "initials": None,
            "department": st.department,
            "designation": st.designation,
            "photo_url": st.photo_url,
            "embedding": emb,
        })

    # 5. Vector matching
    best_candidate, score, decision = matcher.find_best_match(probe_embedding, gallery)

    if decision == "MATCH" and best_candidate:
        person_type_display = "Student" if best_candidate["type"] == "student" else "Staff"
        log_access_event(
            db,
            AccessLogCreate(
                person_type=person_type_display,
                name=best_candidate["name"],
                identifier_value=best_candidate["identifier"],
                department=best_candidate["department"],
                location_block=req.location_block,
                guard_name=req.guard_name or current_user.full_name,
                event_type="ENTRY",
                verification_method="Face Recognition",
                verification_status="Authorized",
                review_status="Verified",
                student_id=best_candidate["id"] if best_candidate["type"] == "student" else None,
                staff_id=best_candidate["id"] if best_candidate["type"] == "staff" else None,
            ),
        )
        return FaceVerifyResponse(
            success=True,
            is_recognized=True,
            is_live=True,
            verification_status="Authorized",
            similarity_score=score,
            matched_person=MatchedPerson(
                person_type=best_candidate["type"],
                identifier=best_candidate["identifier"],
                name=best_candidate["name"],
                initials=best_candidate.get("initials"),
                department=best_candidate["department"],
                year_roman=best_candidate.get("year_roman"),
                batch=best_candidate.get("batch"),
                residence_type=best_candidate.get("residence_type"),
                hostel_name=best_candidate.get("hostel_name"),
                room_number=best_candidate.get("room_number"),
                designation=best_candidate.get("designation"),
                photo_url=best_candidate.get("photo_url"),
                similarity_score=score,
            ),
            liveness_details=LivenessCheckResult(**liveness_res),
            message="Face match confirmed and entry authorized.",
        )

    elif decision == "UNCERTAIN_REVIEW" and best_candidate:
        # Flag for supervisor review
        log_access_event(
            db,
            AccessLogCreate(
                person_type="Unauthorized",
                name=f"Possible: {best_candidate['name']}",
                identifier_value=best_candidate["identifier"],
                department=best_candidate["department"],
                location_block=req.location_block,
                guard_name=req.guard_name or current_user.full_name,
                event_type="ENTRY",
                verification_method="Face Recognition",
                verification_status="Flagged",
                review_status="Pending Verification",
                flag_reason=f"Similarity score {score} falls in uncertain threshold (0.50 - 0.68)",
            ),
        )
        return FaceVerifyResponse(
            success=True,
            is_recognized=False,
            is_live=True,
            verification_status="Flagged",
            similarity_score=score,
            liveness_details=LivenessCheckResult(**liveness_res),
            message="Low confidence similarity. Logged for supervisor verification.",
        )

    else:
        # Unrecognized face
        log_access_event(
            db,
            AccessLogCreate(
                person_type="Unauthorized",
                name="Unrecognized Person",
                identifier_value="UNREC-FACE",
                department="N/A",
                location_block=req.location_block,
                guard_name=req.guard_name or current_user.full_name,
                event_type="ENTRY",
                verification_method="Face Recognition",
                verification_status="Unauthorized",
                review_status="Unauthorised",
                flag_reason="Face does not match any enrolled student or staff record",
            ),
        )
        return FaceVerifyResponse(
            success=False,
            is_recognized=False,
            is_live=True,
            verification_status="Unauthorized",
            similarity_score=score,
            liveness_details=LivenessCheckResult(**liveness_res),
            message="Face not recognized in institution database.",
        )
