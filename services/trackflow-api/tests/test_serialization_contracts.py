from datetime import datetime, timezone
from types import SimpleNamespace

from app.auth import routes as auth_routes
import main as api_main
from main import app
from routers import inventory


def test_login_response_filters_internal_user_fields(client, monkeypatch):
    user = {
        "id": "user-1",
        "email": "user@example.com",
        "role": "user",
        "hashed_password": "never-return-this",
        "is_active": True,
    }
    monkeypatch.setattr(auth_routes, "authenticate_user",
                        lambda email, password: user)
    monkeypatch.setattr(auth_routes, "create_access_token",
                        lambda user_id: "access-token")
    monkeypatch.setattr(
        auth_routes, "get_profile_by_user_id", lambda user_id: None)

    response = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "password"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "access_token": "access-token",
        "token_type": "bearer",
        "user": {"id": "user-1", "email": "user@example.com", "role": "user"},
        "profile": None,
    }
    assert "never-return-this" not in response.text


def test_inventory_orders_returns_minimal_sku_projection(client):
    product = SimpleNamespace(
        id=7,
        name="Caja",
        sku="SKU-7",
        client_name="Cliente privado",
        category="general",
        warehouse="LA",
    )
    entry = SimpleNamespace(
        id=3,
        quantity=4,
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        user_uuid="user-1",
    )

    class Result:
        def __init__(self, rows):
            self.rows = rows

        def all(self):
            return self.rows

    class Session:
        def __init__(self):
            self.results = iter([[(entry, product)], []])

        def exec(self, statement):
            return Result(next(self.results))

    app.dependency_overrides[inventory.get_db] = Session
    try:
        response = client.get("/inventory/orders")
    finally:
        app.dependency_overrides.pop(inventory.get_db, None)

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": 3,
            "movement_type": "inbound",
            "quantity": 4,
            "created_at": "2026-01-01T00:00:00Z",
            "user_uuid": "user-1",
            "sku": {"id": 7, "name": "Caja", "sku": "SKU-7", "warehouse": "LA"},
        }
    ]
    assert "Cliente privado" not in response.text


def test_incident_export_remains_csv(client, monkeypatch):
    monkeypatch.setattr(api_main, "LAST_ANALYSIS", {"total": 1})
    monkeypatch.setattr(api_main, "summary_to_csv", lambda result: "total\n1\n")

    response = client.get("/api/incidents/results/export")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.content == b"total\n1\n"
