import sys

import pytest
from sqlalchemy.exc import OperationalError

from app.auth import admin, routes, users
from app.auth.services import get_user_by_id
from main import app
import promote_superadmin


@pytest.fixture
def account_store(monkeypatch, tmp_path):
    from tinydb import TinyDB
    from app.auth import services

    db = TinyDB(tmp_path / "accounts.json")
    table = db.table("users")
    monkeypatch.setattr(services, "users_table", table)
    for role, active in [("user", True), ("admin", True), ("manager", False), ("superadmin", True)]:
        table.insert({
            "id": role,
            "email": f"{role}@example.com",
            "hashed_password": "private-hash",
            "role": role,
            "is_active": active,
            "created_at": "2026-01-01T00:00:00+00:00",
        })
    yield table
    db.close()


@pytest.mark.parametrize("path", ["/admin/users", "/admin/login-history"])
def test_management_is_superadmin_only(client, path):
    assert client.get(path).status_code in (401, 403)
    try:
        for role in ("user", "manager", "admin"):
            app.dependency_overrides[routes.get_current_user] = lambda: {
                "id": "test", "role": role,
            }
            assert client.get(path).status_code == 403
            assert client.patch("/admin/users/user", json={"role": "admin"}).status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_list_accounts_filters_paginates_and_excludes_secrets(superadmin_client, account_store):
    response = superadmin_client.get("/admin/users?limit=1")
    assert response.status_code == 200
    assert response.json()["total"] == 4
    assert len(response.json()["items"]) == 1
    assert "private-hash" not in response.text
    result = superadmin_client.get("/admin/users?role=manager&is_active=false").json()
    assert result["total"] == 1
    assert result["items"][0]["id"] == "manager"
    assert superadmin_client.get("/admin/users?search=ADMIN@").json()["total"] == 2
    assert superadmin_client.get("/admin/users?offset=4").json()["items"] == []


def test_superadmin_changes_role_and_status_persistently(superadmin_client, account_store):
    response = superadmin_client.patch("/admin/users/user", json={"role": "admin", "is_active": False})
    assert response.status_code == 200
    account = get_user_by_id("user")
    assert account["role"] == "admin"
    assert account["is_active"] is False
    response = superadmin_client.patch("/admin/users/user", json={"role": "user", "is_active": True})
    assert response.status_code == 200
    assert get_user_by_id("user")["role"] == "user"
    assert get_user_by_id("user")["is_active"] is True


@pytest.mark.parametrize("payload", [
    {"role": "superadmin"}, {"password": "test"}, {}, {"is_active": None},
])
def test_management_rejects_unsupported_changes(superadmin_client, account_store, payload):
    assert superadmin_client.patch("/admin/users/user", json=payload).status_code in (400, 422)


def test_protected_superadmin_cannot_be_changed_or_deleted(superadmin_client, account_store):
    assert superadmin_client.patch("/admin/users/superadmin", json={"is_active": False}).status_code == 403
    assert superadmin_client.put("/users/superadmin", json={"password": "changed-password"}).status_code == 403
    assert superadmin_client.delete("/users/superadmin").status_code == 403
    assert superadmin_client.put("/users/user", json={"role": "superadmin"}).status_code == 403
    assert get_user_by_id("superadmin")["is_active"] is True


@pytest.mark.parametrize("payload", [{"role": "admin"}, {"is_active": False}, {"is_active": True}])
def test_legacy_endpoint_cannot_bypass_superadmin(auth_client, current_user, monkeypatch, payload):
    monkeypatch.setattr(users, "get_user_by_id", lambda user_id: current_user)
    assert auth_client.put("/users/user-1", json=payload).status_code == 403


def test_admin_cannot_manage_roles_or_superadmin(admin_client, account_store):
    for payload in ({"role": "user"}, {"is_active": False}):
        assert admin_client.put("/users/user", json=payload).status_code == 403
    assert admin_client.put("/users/superadmin", json={"email": "new@example.com"}).status_code == 403
    assert admin_client.delete("/users/superadmin").status_code == 403


def test_missing_account_returns_404(superadmin_client, account_store):
    assert superadmin_client.patch("/admin/users/missing", json={"role": "admin"}).status_code == 404


def test_login_history_captures_success_failure_inactive_and_swagger(
    client, superadmin_client, account_store, monkeypatch,
):
    # Keep real authentication while replacing only password verification.
    monkeypatch.setattr(routes.bcrypt, "verify", lambda password, hashed: password == "correct")
    attempts = [
        ("user@example.com", "correct", 200),
        ("user@example.com", "wrong", 401),
        ("manager@example.com", "correct", 401),
        ("unknown@example.com", "wrong", 401),
    ]
    for email, password, expected in attempts:
        assert client.post("/auth/login", json={"email": email, "password": password}).status_code == expected
    assert client.post("/auth/token", data={"username": "admin@example.com", "password": "correct"}).status_code == 200
    assert client.post("/auth/token", data={"username": "admin@example.com", "password": "wrong"}).status_code == 401
    response = superadmin_client.get("/admin/login-history")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 6
    assert [item["succeeded"] for item in reversed(data["items"])] == [True, False, False, False, True, False]
    assert data["items"][0]["method"] == "token"
    assert data["items"][0]["created_at"].endswith("Z")
    assert "hashed_password" not in response.text
    assert "correct" not in response.text
    assert superadmin_client.get("/admin/login-history?succeeded=true").json()["total"] == 2
    assert superadmin_client.get("/admin/login-history?search=USER@&limit=1&offset=1").json()["total"] == 2
    assert superadmin_client.get("/admin/login-history?search=%25").json()["total"] == 0


def test_inactive_account_cannot_use_existing_token(client, account_store):
    token = routes.create_access_token("manager")
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    assert client.get("/admin/users", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_deactivation_and_demotion_apply_to_previously_issued_tokens(client, account_store):
    super_headers = {"Authorization": f"Bearer {routes.create_access_token('superadmin')}"}
    admin_headers = {"Authorization": f"Bearer {routes.create_access_token('admin')}"}
    assert client.get("/users", headers=admin_headers).status_code == 200
    response = client.patch("/admin/users/admin", headers=super_headers, json={"role": "user"})
    assert response.status_code == 200
    assert client.get("/users", headers=admin_headers).status_code == 403
    assert client.patch("/admin/users/admin", headers=super_headers, json={"is_active": False}).status_code == 200
    assert client.get("/auth/me", headers=admin_headers).status_code == 401


def test_history_write_failure_is_explicit(client, monkeypatch):
    from app.auth import login_history
    monkeypatch.setattr(routes, "authenticate_user", lambda email, password: {"id": "test"})

    def broken_session(*args, **kwargs):
        raise OperationalError("insert", {}, RuntimeError("unavailable"))

    monkeypatch.setattr(login_history, "Session", broken_session)
    response = client.post("/auth/login", json={"email": "test@example.com", "password": "test"})
    assert response.status_code == 503
    assert "access_token" not in response.json()


def test_superadmin_has_existing_admin_access(client, account_store):
    token = routes.create_access_token("superadmin")
    response = client.get("/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_server_command_promotes_only_existing_active_account(monkeypatch, account_store):
    monkeypatch.setattr(sys, "argv", ["promote_superadmin.py", "user@example.com"])
    assert promote_superadmin.main() == 0
    assert get_user_by_id("user")["role"] == "superadmin"
    for email in ("missing@example.com", "manager@example.com"):
        monkeypatch.setattr(sys, "argv", ["promote_superadmin.py", email])
        assert promote_superadmin.main() == 1
