import os
import base64
import json
import cv2
import numpy as np
from datetime import datetime, timezone
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
from app.models.biometric import BiometricTemplate
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


def parse_embeddings_list(raw_data: Any) -> List[List[float]]:
    """
    Parses single or multi-reference deep face embeddings into a list of 128-d float lists.
    """
    if not raw_data:
        return []
    try:
        data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
        if isinstance(data, list):
            if len(data) == 0:
                return []
            if isinstance(data[0], (int, float)):
                return [data]
            elif isinstance(data[0], (list, np.ndarray)):
                res = []
                for item in data:
                    res.append(item.tolist() if hasattr(item, "tolist") else list(item))
                return res
        elif isinstance(data, dict):
            embs = []
            if "primary" in data and isinstance(data["primary"], list):
                embs.append(data["primary"])
            if "references" in data and isinstance(data["references"], list):
                for r in data["references"]:
                    if isinstance(r, dict) and "embedding" in r:
                        embs.append(r["embedding"])
                    elif isinstance(r, list):
                        embs.append(r)
            return embs
    except Exception:
        pass
    return []


@router.post("/verify-face", response_model=FaceVerifyResponse)
def verify_face_endpoint(
    req: FaceVerifyRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    guard_display_name = req.guard_name or (current_user.full_name if current_user else "G. Selvam")

    # =========================================================================
    # WORKFLOW A: Manual Register Number Verification & Verified Face Enrollment
    # =========================================================================
    if req.register_number:
        reg_clean = req.register_number.strip().upper()
        student = db.query(Student).filter(Student.register_number == reg_clean).first()
        staff = None
        if not student:
            staff = db.query(Staff).filter(Staff.employee_id == reg_clean).first()

        if not student and not staff:
            # Register number not found in institution database records
            log_access_event(
                db,
                AccessLogCreate(
                    person_type="Unauthorized",
                    name="Unknown Person",
                    identifier_value=reg_clean,
                    department="N/A",
                    location_block=req.location_block,
                    guard_name=guard_display_name,
                    event_type="ENTRY",
                    verification_method="Register ID",
                    verification_status="Unauthorized",
                    review_status="Unauthorised",
                    flag_reason="Register number not found in institution database records",
                ),
            )
            return FaceVerifyResponse(
                success=False,
                is_recognized=False,
                is_live=True,
                verification_status="Unauthorized",
                similarity_score=0.0,
                message="Register number not found in institution database records.",
            )

        target_obj = student if student is not None else staff
        is_student = student is not None
        is_authorized = bool(target_obj.is_active)
        status_text = "Authorized" if is_authorized else "Unauthorized"
        review_text = "Verified" if is_authorized else "Unauthorised"

        if not is_authorized:
            log_access_event(
                db,
                AccessLogCreate(
                    person_type="Student" if is_student else "Staff",
                    name=target_obj.name,
                    identifier_value=reg_clean,
                    department=target_obj.department,
                    location_block=req.location_block,
                    guard_name=guard_display_name,
                    event_type="ENTRY",
                    verification_method="Register ID",
                    verification_status="Unauthorized",
                    review_status="Unauthorised",
                    flag_reason="Person is marked as inactive or suspended in institution records",
                    student_id=target_obj.id if is_student else None,
                    staff_id=target_obj.id if not is_student else None,
                ),
            )
            return FaceVerifyResponse(
                success=False,
                is_recognized=True,
                is_live=True,
                verification_status="Unauthorized",
                similarity_score=1.0,
                matched_person=MatchedPerson(
                    person_type="student" if is_student else "staff",
                    identifier=reg_clean,
                    name=target_obj.name,
                    initials=getattr(target_obj, "initials", None),
                    department=target_obj.department,
                    year_roman=getattr(target_obj, "year_roman", None),
                    batch=getattr(target_obj, "batch", None),
                    residence_type=getattr(target_obj, "residence_type", None),
                    hostel_name=getattr(target_obj, "hostel_name", None),
                    room_number=getattr(target_obj, "room_number", None),
                    designation=getattr(target_obj, "designation", None),
                    photo_url=target_obj.photo_url,
                    similarity_score=1.0,
                ),
                message="Person is marked as inactive or suspended in institution records.",
            )

        # Active & Authorized student/staff verified by register number!
        # Step: Process the retained photograph from the failed face scan session
        new_ref_added = False
        newly_enrolled_photo_url = target_obj.photo_url
        if req.image_base64:
            try:
                probe_img = decode_base64_image(req.image_base64)
                if probe_img is not None and probe_img.size > 0:
                    faces = detector.detect_faces(probe_img)
                    sig_faces = [f for f in faces if f["box"][2] >= 40 and f["box"][3] >= 40]
                    if len(sig_faces) == 1:
                        primary_face = sig_faces[0]
                        landmarks = primary_face.get("landmarks", [])
                        if len(landmarks) >= 2:
                            aligned = detector.align_face(probe_img, primary_face)
                            gray = cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY)
                            blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
                            if blur_var >= 20.0:
                                new_embedding = embedder.extract_embedding(probe_img, primary_face)
                                new_emb_list = new_embedding.tolist() if hasattr(new_embedding, "tolist") else list(new_embedding)

                                # Save newly captured photograph
                                ts_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
                                filename = f"{reg_clean}_{ts_str}.jpg"
                                upload_path = os.path.abspath(
                                    os.path.join(os.path.dirname(__file__), f"../../../../uploads/captured_faces/{filename}")
                                )
                                public_path = os.path.abspath(
                                    os.path.join(os.path.dirname(__file__), f"../../../../public/faces/captured/{filename}")
                                )
                                os.makedirs(os.path.dirname(upload_path), exist_ok=True)
                                os.makedirs(os.path.dirname(public_path), exist_ok=True)
                                cv2.imwrite(upload_path, probe_img)
                                cv2.imwrite(public_path, probe_img)

                                newly_enrolled_photo_url = f"/faces/captured/{filename}"
                                target_obj.photo_url = newly_enrolled_photo_url

                                # Append to existing face reference collection
                                existing_embs = parse_embeddings_list(target_obj.face_embedding)
                                existing_embs.append(new_emb_list)
                                target_obj.face_embedding = json.dumps(existing_embs)

                                # Update BiometricTemplate
                                bt = db.query(BiometricTemplate).filter(BiometricTemplate.person_identifier == reg_clean).first()
                                if bt:
                                    bt.embedding_data = json.dumps(existing_embs)
                                    bt.enrolled_at = datetime.now(timezone.utc)
                                else:
                                    bt = BiometricTemplate(
                                        person_type="student" if is_student else "staff",
                                        person_identifier=reg_clean,
                                        embedding_data=json.dumps(existing_embs),
                                        model_version="sface-yunet-v1",
                                        is_active=True,
                                    )
                                    db.add(bt)

                                # Update enrolled_embeddings.json fallback
                                emb_file = os.path.abspath(
                                    os.path.join(os.path.dirname(__file__), "../../../../public/faces/enrolled_embeddings.json")
                                )
                                if os.path.exists(emb_file):
                                    try:
                                        with open(emb_file, "r") as ef:
                                            all_embs = json.load(ef)
                                        all_embs[reg_clean] = existing_embs
                                        all_embs[target_obj.name] = existing_embs
                                        with open(emb_file, "w") as ef:
                                            json.dump(all_embs, ef, indent=2)
                                    except Exception as ex:
                                        print(f"Warning: could not update enrolled_embeddings.json: {ex}")

                                db.commit()
                                new_ref_added = True
            except Exception as e:
                print(f"Warning: error during manual enrollment photo processing: {e}")
                db.rollback()

        # Log access event
        method_str = "Register ID + Verified Face Reference" if new_ref_added else "Register ID"
        log_access_event(
            db,
            AccessLogCreate(
                person_type="Student" if is_student else "Staff",
                name=target_obj.name,
                identifier_value=reg_clean,
                department=target_obj.department,
                location_block=req.location_block,
                guard_name=guard_display_name,
                event_type="ENTRY",
                verification_method=method_str,
                verification_status=status_text,
                review_status=review_text,
                student_id=target_obj.id if is_student else None,
                staff_id=target_obj.id if not is_student else None,
            ),
        )

        return FaceVerifyResponse(
            success=True,
            is_recognized=True,
            is_live=True,
            verification_status="Authorized",
            similarity_score=1.0,
            matched_person=MatchedPerson(
                person_type="student" if is_student else "staff",
                identifier=reg_clean,
                name=target_obj.name,
                initials=getattr(target_obj, "initials", None),
                department=target_obj.department,
                year_roman=getattr(target_obj, "year_roman", None),
                batch=getattr(target_obj, "batch", None),
                residence_type=getattr(target_obj, "residence_type", None),
                hostel_name=getattr(target_obj, "hostel_name", None),
                room_number=getattr(target_obj, "room_number", None),
                designation=getattr(target_obj, "designation", None),
                photo_url=newly_enrolled_photo_url,
                similarity_score=1.0,
            ),
            candidate_scores={target_obj.name: 100.0},
            message="Identity verified via Register ID lookup and new verified face reference enrolled." if new_ref_added else "Identity verified via Register ID lookup.",
        )

    # =========================================================================
    # WORKFLOW B: Live Camera Face Recognition Pipeline
    # =========================================================================
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

    # Filter significant faces (w >= 40, h >= 40) to eliminate tiny noise specks
    sig_faces = [f for f in faces if f["box"][2] >= 40 and f["box"][3] >= 40]
    if not sig_faces:
        sig_faces = faces

    # Error handling: Multiple faces in single scan
    if len(sig_faces) > 1:
        return FaceVerifyResponse(
            success=False,
            is_recognized=False,
            is_live=False,
            verification_status="Unauthorized",
            similarity_score=0.0,
            message="Multiple faces detected in camera frame. Only one individual permitted per security scan.",
        )

    # Primary face sorted by area descending
    sig_faces.sort(key=lambda f: f["box"][2] * f["box"][3], reverse=True)
    primary_face = sig_faces[0]
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

    # Invariance against mirrored camera streams (front-facing webcams / CSS scaleX(-1))
    probe_flip = cv2.flip(probe_img, 1)
    flip_faces = detector.detect_faces(probe_flip)
    flip_faces.sort(key=lambda f: f["box"][2] * f["box"][3], reverse=True)
    probe_flip_embedding = None
    if flip_faces:
        probe_flip_embedding = embedder.extract_embedding(probe_flip, flip_faces[0])

    # 5. Build Gallery from enrolled Students and Staff (with multi-reference support)
    enrolled_students = db.query(Student).all()
    gallery: List[Dict[str, Any]] = []
    for s in enrolled_students:
        embs = parse_embeddings_list(s.face_embedding)
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
            "embeddings": embs,
            "embedding": embs[0] if embs else None,
            "is_active": s.is_active,
        })

    enrolled_staff = db.query(Staff).all()
    for st in enrolled_staff:
        embs = parse_embeddings_list(st.face_embedding)
        gallery.append({
            "type": "staff",
            "id": st.id,
            "identifier": st.employee_id,
            "name": st.name,
            "initials": None,
            "department": st.department,
            "designation": st.designation,
            "photo_url": st.photo_url,
            "embeddings": embs,
            "embedding": embs[0] if embs else None,
            "is_active": st.is_active,
        })

    # 6. Compute candidate comparison scores across gallery (max sim across references and orientations)
    candidate_scores: Dict[str, float] = {}
    for item in gallery:
        target_embs = item.get("embeddings") or ([item["embedding"]] if item.get("embedding") else [])
        best_sim = 0.0
        for e in target_embs:
            ref_arr = np.array(e, dtype=np.float32)
            sim1 = matcher.cosine_similarity(probe_embedding, ref_arr)
            sim2 = matcher.cosine_similarity(probe_flip_embedding, ref_arr) if probe_flip_embedding is not None else 0.0
            sim = max(sim1, sim2)
            if sim > best_sim:
                best_sim = sim
        sim_pct = round(max(0.0, best_sim) * 100, 1)
        candidate_scores[item["name"]] = sim_pct
        candidate_scores[item["identifier"]] = sim_pct
        if item.get("initials"):
            candidate_scores[item["initials"]] = sim_pct

    # Also map Sur, Mon, Mith, Thiru aliases for Figma card compatibility
    name_alias_map = {
        "23MED0412": ["Sur", "Surendhar G"],
        "23AHS0185": ["Mon", "Moniesh V"],
        "22ECE0531": ["Mith", "Mithun K"],
        "22CSE0789": ["Thiru", "Thirumavalavan"],
    }
    for reg, aliases in name_alias_map.items():
        if reg in candidate_scores:
            for al in aliases:
                candidate_scores[al] = candidate_scores[reg]

    # 7. Vector matching across multi-reference gallery (testing both probe orientations)
    best_candidate1, score1, decision1 = matcher.find_best_match(probe_embedding, gallery)
    best_candidate2, score2, decision2 = (None, -1.0, "NO_MATCH")
    if probe_flip_embedding is not None:
        best_candidate2, score2, decision2 = matcher.find_best_match(probe_flip_embedding, gallery)

    if score2 > score1:
        best_candidate, score, decision = best_candidate2, score2, decision2
    else:
        best_candidate, score, decision = best_candidate1, score1, decision1

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


@router.post("/evaluate")
def evaluate_ai_pipeline(db: Session = Depends(get_db)):
    from ai.evaluator import run_benchmark, evaluate_enrolled_dataset
    benchmarks = run_benchmark()
    eval_results = evaluate_enrolled_dataset()
    return {
        "status": "success",
        "benchmarks": benchmarks,
        "evaluation": eval_results,
    }
