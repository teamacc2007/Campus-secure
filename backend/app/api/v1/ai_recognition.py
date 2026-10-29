import base64
import json
import cv2
import numpy as np
from typing import Optional, Dict, Any, List
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
from app.api.deps import get_current_user_optional
from app.models.user import User

from app.core.config import settings
from ai.detector import FaceDetector
from ai.embedder import FaceEmbedder
from ai.matcher import FaceMatcher
from ai.liveness import LivenessEvaluator

router = APIRouter(prefix="/ai", tags=["AI & Biometrics"])

detector = FaceDetector(model_path=settings.FACE_DETECTION_MODEL_PATH)
embedder = FaceEmbedder(model_path=settings.FACE_RECOGNITION_MODEL_PATH)
matcher = FaceMatcher(match_threshold=settings.FACE_MATCH_THRESHOLD, uncertain_threshold=0.50)
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
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    guard_display_name = req.guard_name or (current_user.full_name if current_user else "G. Selvam")

    # Check if direct register_number fallback was provided
    if req.register_number:
        student = db.query(Student).filter(Student.register_number == req.register_number.strip().upper()).first()
        if student:
            # Check student authorization
            is_authorized = bool(student.is_active)
            status_text = "Authorized" if is_authorized else "Unauthorized"
            review_text = "Verified" if is_authorized else "Unauthorised"

            # Log access event
            log_access_event(
                db,
                AccessLogCreate(
                    person_type="Student",
                    name=student.name,
                    identifier_value=student.register_number,
                    department=student.department,
                    location_block=req.location_block,
                    guard_name=guard_display_name,
                    event_type="ENTRY",
                    verification_method="Register ID",
                    verification_status=status_text,
                    review_status=review_text,
                    student_id=student.id,
                ),
            )
            return FaceVerifyResponse(
                success=is_authorized,
                is_recognized=True,
                is_live=True,
                verification_status=status_text,
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
                candidate_scores={student.name: 100.0},
                message=f"Identity verified via Register ID lookup ({status_text}).",
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

    # 1. Face detection with real facial landmarks
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

    # Error handling: Multiple faces in single scan
    if len(faces) > 1:
        return FaceVerifyResponse(
            success=False,
            is_recognized=False,
            is_live=False,
            verification_status="Unauthorized",
            similarity_score=0.0,
            message="Multiple faces detected in camera frame. Only one individual permitted per security scan.",
        )

    primary_face = faces[0]
    landmarks = primary_face.get("landmarks", [])

    # Check landmark detection
    if len(landmarks) < 2:
        return FaceVerifyResponse(
            success=False,
            is_recognized=False,
            is_live=False,
            verification_status="Unauthorized",
            similarity_score=0.0,
            message="Facial landmark detection failed. Ensure face is centered and facing the camera directly.",
        )

    # 2. Align face using real facial landmark coordinates
    aligned_face = detector.align_face(probe_img, primary_face)

    # 3. Liveness Evaluation
    liveness_res = liveness_evaluator.evaluate(aligned_face)
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
                guard_name=guard_display_name,
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
            landmarks=landmarks,
            message="Liveness check failed. Potential presentation attack detected.",
        )

    # 4. Extract Probe Embedding using facial landmark aligned features
    probe_embedding = embedder.extract_embedding(probe_img, primary_face)

    # 5. Build Gallery from enrolled Students and Staff
    enrolled_students = db.query(Student).all()
    gallery: List[Dict[str, Any]] = []
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
            "is_active": s.is_active,
        })

    enrolled_staff = db.query(Staff).all()
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
            "is_active": st.is_active,
        })

    # 6. Compute candidate comparison scores across gallery
    candidate_scores: Dict[str, float] = {}
    for item in gallery:
        target_emb = item.get("embedding")
        if target_emb:
            sim = matcher.cosine_similarity(probe_embedding, np.array(target_emb, dtype=np.float32))
            score_pct = round(max(0.0, sim) * 100, 1)
            candidate_scores[item["name"]] = score_pct

    # 7. Vector matching
    best_candidate, score, decision = matcher.find_best_match(probe_embedding, gallery)

    # 8. PostgreSQL / Database authorization verification
    if decision == "MATCH" and best_candidate:
        is_active = best_candidate.get("is_active", True)
        if not is_active:
            # Recognized person is inactive/revoked in database -> Unauthorized
            log_access_event(
                db,
                AccessLogCreate(
                    person_type=best_candidate["type"].capitalize(),
                    name=best_candidate["name"],
                    identifier_value=best_candidate["identifier"],
                    department=best_candidate["department"],
                    location_block=req.location_block,
                    guard_name=guard_display_name,
                    event_type="ENTRY",
                    verification_method="Face Recognition",
                    verification_status="Unauthorized",
                    review_status="Unauthorised",
                    flag_reason="Recognized individual is marked inactive in institution records",
                    student_id=best_candidate["id"] if best_candidate["type"] == "student" else None,
                    staff_id=best_candidate["id"] if best_candidate["type"] == "staff" else None,
                ),
            )
            return FaceVerifyResponse(
                success=False,
                is_recognized=True,
                is_live=True,
                verification_status="Unauthorized",
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
                candidate_scores=candidate_scores,
                landmarks=landmarks,
                message="Recognized identity is inactive or revoked in institution records.",
            )

        # Active and authorized
        person_type_display = "Student" if best_candidate["type"] == "student" else "Staff"
        log_access_event(
            db,
            AccessLogCreate(
                person_type=person_type_display,
                name=best_candidate["name"],
                identifier_value=best_candidate["identifier"],
                department=best_candidate["department"],
                location_block=req.location_block,
                guard_name=guard_display_name,
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
            candidate_scores=candidate_scores,
            landmarks=landmarks,
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
                guard_name=guard_display_name,
                event_type="ENTRY",
                verification_method="Face Recognition",
                verification_status="Flagged",
                review_status="Pending Verification",
                flag_reason=f"Similarity score {score} falls in uncertain threshold (0.50 - {settings.FACE_MATCH_THRESHOLD})",
            ),
        )
        return FaceVerifyResponse(
            success=False,
            is_recognized=False,
            is_live=True,
            verification_status="Flagged",
            similarity_score=score,
            candidate_scores=candidate_scores,
            landmarks=landmarks,
            liveness_details=LivenessCheckResult(**liveness_res),
            message="Low confidence similarity. Logged for supervisor verification.",
        )

    else:
        # Unrecognized face (below threshold)
        log_access_event(
            db,
            AccessLogCreate(
                person_type="Unauthorized",
                name="Unrecognized Person",
                identifier_value="UNREC-FACE",
                department="N/A",
                location_block=req.location_block,
                guard_name=guard_display_name,
                event_type="ENTRY",
                verification_method="Face Recognition",
                verification_status="Unauthorized",
                review_status="Unauthorised",
                flag_reason=f"Face does not match any enrolled record above {int(settings.FACE_MATCH_THRESHOLD * 100)}% threshold",
            ),
        )
        return FaceVerifyResponse(
            success=False,
            is_recognized=False,
            is_live=True,
            verification_status="Unauthorized",
            similarity_score=score,
            candidate_scores=candidate_scores,
            landmarks=landmarks,
            liveness_details=LivenessCheckResult(**liveness_res),
            message=f"Face not recognized in institution database. All scores below {int(settings.FACE_MATCH_THRESHOLD * 100)}% threshold.",
        )
