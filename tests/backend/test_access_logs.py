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


def test_unauthorized_count_endpoint():
    res = client.get("/api/v1/access-logs/unauthorized-count")
    assert res.status_code == 200
    data = res.json()
    assert "count" in data
    assert isinstance(data["count"], int)
    assert data["review_status"] == "Pending Verification"



def test_supervisor_assigned_guards():
    res = client.get("/api/v1/guards/assigned")
    assert res.status_code == 200
    guards = res.json()
    assert isinstance(guards, list)
    assert len(guards) >= 2
    codes = [g["guard_code"] for g in guards]
    assert "SG-101" in codes
    assert any(g["name"] == "G. Selvam" for g in guards)


def test_supervisor_unauthorized_records_filtering(supervisor_token):
    headers = {"Authorization": f"Bearer {supervisor_token}"}
    
    # 1. Option 1: All unauthorized records
    res_all = client.get("/api/v1/access-logs/supervisor-unauthorized", headers=headers)
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert "count" in data_all
    assert "records" in data_all
    assert data_all["count"] > 0
    
    # 2. Option 2: Filter by guard name (G. Selvam)
    res_selvam = client.get("/api/v1/access-logs/supervisor-unauthorized?guard_name=G.%20Selvam", headers=headers)
    assert res_selvam.status_code == 200
    data_selvam = res_selvam.json()
    assert all(r["guard_name"] == "G. Selvam" for r in data_selvam["records"])
    assert data_selvam["count"] <= data_all["count"]
    
    # 3. Filter by date range
    res_date = client.get(
        "/api/v1/access-logs/supervisor-unauthorized?from_date=2025-06-16&to_date=2025-06-16",
        headers=headers
    )
    assert res_date.status_code == 200
    data_date = res_date.json()
    assert all("2025-06-16" in r["timestamp"] for r in data_date["records"])
    
    # 4. Scope restriction: out-of-scope guard returns 403 Forbidden
    res_forbidden = client.get(
        "/api/v1/access-logs/supervisor-unauthorized?guard_id=9999",
        headers=headers
    )
    assert res_forbidden.status_code == 403
    assert "Access denied" in res_forbidden.json()["detail"]
