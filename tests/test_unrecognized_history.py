import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.access_log import AccessLog


def test_unrecognized_history_endpoint():
    client = TestClient(app)
    resp = client.get("/api/v1/access-logs/unrecognized")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    
    # Verify every returned record is an actual unrecognized face event
    for item in data:
        assert item["verification_status"] == "Unauthorized"
        assert item["verification_method"] == "Face Recognition"
        assert item["name"] in ["Unrecognized Person", "Unrecognized person", "Unknown Individual", "Unknown Person"]


def test_recognized_student_not_in_unrecognized_history():
    db = SessionLocal()
    # Check that authorized access logs are not returned in /unrecognized
    client = TestClient(app)
    resp = client.get("/api/v1/access-logs/unrecognized")
    assert resp.status_code == 200
    data = resp.json()
    for item in data:
        assert item["verification_status"] != "Authorized"


def test_unrecognized_history_ordering_newest_first():
    client = TestClient(app)
    resp = client.get("/api/v1/access-logs/unrecognized")
    assert resp.status_code == 200
    data = resp.json()
    if len(data) >= 2:
        ids = [item["id"] for item in data]
        assert ids == sorted(ids, reverse=True)
