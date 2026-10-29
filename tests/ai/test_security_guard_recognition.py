import os
import sys
import base64
import cv2
import pytest
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from ai.detector import FaceDetector
from ai.embedder import FaceEmbedder
from ai.matcher import FaceMatcher
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.student import Student

client = TestClient(app)


def test_enrolled_person_full_photo_matching():
    """1. Test enrolled person using independent full photograph against enrolled crop."""
    with open("public/faces/sur.jpg", "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    res = client.post(
        "/api/v1/ai/verify-face",
        json={"image_base64": b64, "location_block": "Gate 1 Main Entrance", "guard_name": "G. Selvam"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_recognized"] is True
    assert data["verification_status"] == "Authorized"
    assert data["similarity_score"] >= 0.65
    assert data["matched_person"]["name"] == "Sur"
    assert data["matched_person"]["identifier"] == "23MED0412"


def test_enrolled_person_lighting_variation():
    """2. Test enrolled person under brightness and contrast changes."""
    img = cv2.imread("public/faces/mon.jpg")
    # Increase brightness by 40 and contrast by 1.2
    varied = cv2.convertScaleAbs(img, alpha=1.2, beta=30)
    _, enc = cv2.imencode(".jpg", varied)
    b64 = base64.b64encode(enc).decode("utf-8")

    res = client.post(
        "/api/v1/ai/verify-face",
        json={"image_base64": b64, "location_block": "Gate 1 Main Entrance", "guard_name": "G. Selvam"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_recognized"] is True
    assert data["matched_person"]["name"] == "Mon"
    assert data["similarity_score"] >= 0.65


def test_enrolled_person_camera_simulation():
    """3. Test enrolled person simulated via 640x480 webcam capture."""
    img = cv2.imread("public/faces/mith.jpg")
    webcam_sim = cv2.resize(img, (640, 480))
    _, enc = cv2.imencode(".jpg", webcam_sim)
    b64 = base64.b64encode(enc).decode("utf-8")

    res = client.post(
        "/api/v1/ai/verify-face",
        json={"image_base64": b64, "location_block": "Gate 1 Main Entrance", "guard_name": "G. Selvam"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_recognized"] is True
    assert data["matched_person"]["name"] == "Mith"
    assert data["similarity_score"] >= 0.65


def test_enrolled_person_head_pose_variation():
    """4. Test enrolled person with small rotation / head tilt (5 degrees)."""
    img = cv2.imread("public/faces/thiru.jpg")
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), 5, 1.0)
    rotated = cv2.warpAffine(img, M, (w, h))
    _, enc = cv2.imencode(".jpg", rotated)
    b64 = base64.b64encode(enc).decode("utf-8")

    res = client.post(
        "/api/v1/ai/verify-face",
        json={"image_base64": b64, "location_block": "Gate 1 Main Entrance", "guard_name": "G. Selvam"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_recognized"] is True
    assert data["matched_person"]["name"] == "Thiru"
    assert data["similarity_score"] >= 0.65


def test_unknown_person_rejected():
    """5. Test unknown individual is strictly rejected (<65%)."""
    # Create non-enrolled inverted synthetic face pattern
    img = cv2.imread("public/faces/sur.jpg")
    inverted = cv2.bitwise_not(img)
    _, enc = cv2.imencode(".jpg", inverted)
    b64 = base64.b64encode(enc).decode("utf-8")

    res = client.post(
        "/api/v1/ai/verify-face",
        json={"image_base64": b64, "location_block": "Gate 1 Main Entrance", "guard_name": "G. Selvam"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_recognized"] is False
    assert data["verification_status"] == "Unauthorized"
    assert data["similarity_score"] < 0.65


def test_blurred_or_poorly_illuminated_face():
    """6. Test heavily blurred face handling."""
    img = cv2.imread("public/faces/sur.jpg")
    heavily_blurred = cv2.GaussianBlur(img, (99, 99), 30)
    _, enc = cv2.imencode(".jpg", heavily_blurred)
    b64 = base64.b64encode(enc).decode("utf-8")

    res = client.post(
        "/api/v1/ai/verify-face",
        json={"image_base64": b64, "location_block": "Gate 1 Main Entrance", "guard_name": "G. Selvam"}
    )
    assert res.status_code == 200
    data = res.json()
    # Heavily blurred image should fail detection or fail recognition
    assert data["is_recognized"] is False
    assert data["verification_status"] == "Unauthorized"


def test_image_without_face():
    """7. Test image without a face (blank / background image)."""
    blank = np.zeros((300, 300, 3), dtype=np.uint8)
    _, enc = cv2.imencode(".jpg", blank)
    b64 = base64.b64encode(enc).decode("utf-8")

    res = client.post(
        "/api/v1/ai/verify-face",
        json={"image_base64": b64, "location_block": "Gate 1 Main Entrance", "guard_name": "G. Selvam"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_recognized"] is False
    assert "No face detected" in data["message"]


def test_multiple_faces_detected():
    """8. Test image containing multiple faces is rejected per security policy."""
    img1 = cv2.imread("public/faces/sur.jpg")
    img2 = cv2.imread("public/faces/mon.jpg")
    h = min(img1.shape[0], img2.shape[0])
    combined = np.hstack([cv2.resize(img1, (400, h)), cv2.resize(img2, (400, h))])
    _, enc = cv2.imencode(".jpg", combined)
    b64 = base64.b64encode(enc).decode("utf-8")

    res = client.post(
        "/api/v1/ai/verify-face",
        json={"image_base64": b64, "location_block": "Gate 1 Main Entrance", "guard_name": "G. Selvam"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_recognized"] is False
    assert "Multiple faces detected" in data["message"]


def test_failed_capture_invalid_base64():
    """9. Test invalid/corrupted image payload handling."""
    res = client.post(
        "/api/v1/ai/verify-face",
        json={"image_base64": "not_a_valid_base64", "location_block": "Gate 1 Main Entrance"}
    )
    assert res.status_code in (400, 422)


def test_landmark_detection_coordinates():
    """10. Verify actual 5-point facial landmark coordinates are returned."""
    detector = FaceDetector()
    img = cv2.imread("public/faces/sur.jpg")
    faces = detector.detect_faces(img)
    assert len(faces) == 1
    landmarks = faces[0]["landmarks"]
    assert len(landmarks) == 5
    # Check right eye, left eye, nose, right mouth, left mouth
    for pt in landmarks:
        assert len(pt) == 2
        assert pt[0] > 0 and pt[1] > 0


def test_recognized_but_unauthorized_inactive_student():
    """11. Test that a recognized individual with inactive database record is Unauthorized."""
    db = SessionLocal()
    student = db.query(Student).filter(Student.register_number == "23MED0412").first()
    original_status = student.is_active
    try:
        # Mark student inactive
        student.is_active = False
        db.commit()

        with open("public/faces/sur.jpg", "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        res = client.post(
            "/api/v1/ai/verify-face",
            json={"image_base64": b64, "location_block": "Gate 1 Main Entrance", "guard_name": "G. Selvam"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_recognized"] is True
        assert data["verification_status"] == "Unauthorized"
        assert "inactive or revoked" in data["message"]
    finally:
        # Restore original status
        student.is_active = original_status
        db.commit()
        db.close()


def test_register_number_lookup():
    """12. Test register number manual fallback."""
    res = client.post(
        "/api/v1/ai/verify-face",
        json={"register_number": "23MED0412", "location_block": "Gate 1 Main Entrance", "guard_name": "G. Selvam"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_recognized"] is True
    assert data["verification_status"] == "Authorized"
    assert data["matched_person"]["name"] == "Sur"
