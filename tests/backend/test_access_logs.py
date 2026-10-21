import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.main import app

client = TestClient(app)


@pytest.fixture
def supervisor_token():
    res = client.post("/api/v1/auth/login", json={"username": "supervisor", "password": "12345"})
    return res.json()["access_token"]


@pytest.fixture
def security_token():
    res = client.post("/api/v1/auth/login", json={"username": "security", "password": "12345"})
    return res.json()["access_token"]


def test_log_access_and_supervisor_review(security_token, supervisor_token):
    # 1. Guard logs an unauthorized attempt
    log_payload = {
        "person_type": "Unauthorized",
        "name": "Unidentified Individual",
        "identifier_value": "NO-ID",
        "location_block": "Gate 2 Hospital Entrance",
        "event_type": "ENTRY",
        "verification_method": "Face Recognition",
        "verification_status": "Flagged",
        "review_status": "Pending Verification",
        "flag_reason": "Person attempted entry without valid student ID or visitor pass",
    }
    sec_headers = {"Authorization": f"Bearer {security_token}"}
    create_res = client.post("/api/v1/access-logs/", json=log_payload, headers=sec_headers)
    assert create_res.status_code == 201
    log_entry = create_res.json()
    log_id = log_entry["id"]
    assert log_entry["review_status"] == "Pending Verification"

    # 2. Supervisor checks pending alerts
    sup_headers = {"Authorization": f"Bearer {supervisor_token}"}
    alerts_res = client.get("/api/v1/access-logs/alerts", headers=sup_headers)
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert any(a["id"] == log_id for a in alerts)

    # 3. Supervisor reviews and marks as Unauthorised / Revoked
    review_res = client.post(
        f"/api/v1/access-logs/{log_id}/review",
        json={"action_type": "Unauthorised", "reason": "Confirmed non-student after verification with warden"},
        headers=sup_headers,
    )
    assert review_res.status_code == 200
    reviewed_entry = review_res.json()
    assert reviewed_entry["review_status"] == "Unauthorised"
    assert reviewed_entry["verification_status"] == "Unauthorized"
    assert len(reviewed_entry["review_actions"]) >= 1
    assert reviewed_entry["review_actions"][-1]["type"] == "Unauthorised"
