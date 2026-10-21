import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.main import app

client = TestClient(app)


def test_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "security", "password": "12345"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "security"
    assert data["username"] == "security"


def test_login_invalid_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "security", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_get_current_user_me():
    # 1. Login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "supervisor", "password": "12345"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # 2. Call /auth/me
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["username"] == "supervisor"
    assert user_data["role"] == "supervisor"


def test_protected_route_without_token():
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
