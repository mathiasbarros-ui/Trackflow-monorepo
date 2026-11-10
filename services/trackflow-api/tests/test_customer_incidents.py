import pytest

from app.incidents import database


@pytest.fixture
def incident_store(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "INCIDENTS_DB", tmp_path / "incidents.json")


@pytest.fixture
def report():
    return {
        "title": " No llego mi pedido ",
        "description": " Necesito ayuda con la entrega. ",
        "category": "pedidos",
        "origin": "customer",
        "branch": "central",
        "status": "open",
    }


def test_customer_report_is_persisted_with_authenticated_author(
    auth_client, current_user, incident_store, report
):
    response = auth_client.post("/api/incidents", json=report)

    assert response.status_code == 201
    result = response.json()
    assert result["reported_by_user_id"] == current_user["id"]
    assert result["title"] == report["title"].strip()
    assert result["origin"] == "customer"
    assert result["status"] == "open"
    db, table = database.get_incidents_table()
    try:
        assert table.all()[0]["id"] == result["id"]
    finally:
        db.close()


@pytest.mark.parametrize(
    ("field", "value"), [("origin", "internal"), ("status", "resolved")]
)
def test_customer_cannot_spoof_internal_or_resolved_report(
    auth_client, incident_store, report, field, value
):
    response = auth_client.post("/api/incidents", json={**report, field: value})
    assert response.status_code == 403


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("GET", "/api/incidents", None),
        ("GET", "/api/incidents/summary", None),
        ("GET", "/api/incidents/1", None),
        ("PATCH", "/api/incidents/1/status", {"status": "in_progress"}),
    ],
)
def test_customer_cannot_use_admin_incident_operations(
    auth_client, incident_store, method, path, body
):
    assert auth_client.request(method, path, json=body).status_code == 403


def test_report_requires_login(client, report):
    assert client.post("/api/incidents", json=report).status_code in (401, 403)


def test_admin_can_manage_customer_reports(admin_client, incident_store, report):
    created = admin_client.post("/api/incidents", json=report)
    assert created.status_code == 201
    incident_id = created.json()["id"]
    assert len(admin_client.get("/api/incidents").json()) == 1
    assert admin_client.get("/api/incidents/summary").json()["total"] == 1
    assert admin_client.get(f"/api/incidents/{incident_id}").status_code == 200
    response = admin_client.patch(
        f"/api/incidents/{incident_id}/status", json={"status": "in_progress"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


def test_report_rejects_empty_description(auth_client, incident_store, report):
    response = auth_client.post("/api/incidents", json={**report, "description": " "})
    assert response.status_code == 400
