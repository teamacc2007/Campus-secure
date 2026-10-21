import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.main import app

client = TestClient(app)


@pytest.fixture
def access_supervisor_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "access", "password": "12345"},
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def test_create_and_cancel_visitor_pass(access_supervisor_token):
    headers = {"Authorization": f"Bearer {access_supervisor_token}"}

    # 1. Create a pass
    draft = {
        "visitor_name": "Test Visitor",
        "visitor_phone": "9876543299",
        "purpose": "Campus Visit & Inspection",
        "start_date": "21-10-2026",
        "end_date": "21-10-2026",
        "accessible_blocks": ["Admin Block", "Main Library"],
        "coordinator_name": "Prof. S. Venkatesh",
        "coordinator_phone": "9876543212",
        "is_bulk": False,
    }
    create_res = client.post("/api/v1/visitor-passes/", json=draft, headers=headers)
    assert create_res.status_code == 201
    created_pass = create_res.json()
    pass_id = created_pass["id"]
    assert created_pass["visitor_name"] == "Test Visitor"
    assert created_pass["status"] == "Active"
    assert created_pass["pass_number"].startswith("VP-")

    # 2. Query list
    list_res = client.get("/api/v1/visitor-passes/?query=Test Visitor", headers=headers)
    assert list_res.status_code == 200
    passes = list_res.json()
    assert any(p["id"] == pass_id for p in passes)

    # 3. Cancel pass with reason
    cancel_res = client.post(
        f"/api/v1/visitor-passes/{pass_id}/cancel",
        json={"reason": "Visitor rescheduled meeting to next week"},
        headers=headers,
    )
    assert cancel_res.status_code == 200
    cancelled_pass = cancel_res.json()
    assert cancelled_pass["status"] == "Cancelled"
    assert cancelled_pass["cancellation_reason"] == "Visitor rescheduled meeting to next week"
    assert cancelled_pass["cancelled_at"] is not None

    # 4. Attempting to cancel already cancelled pass should return 400
    repeat_cancel = client.post(
        f"/api/v1/visitor-passes/{pass_id}/cancel",
        json={"reason": "Repeat cancellation attempt"},
        headers=headers,
    )
    assert repeat_cancel.status_code == 400
