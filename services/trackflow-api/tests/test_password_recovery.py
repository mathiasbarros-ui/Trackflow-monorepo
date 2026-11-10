from datetime import datetime, timedelta, timezone

import pytest

from app.auth import routes


class FakeResetToken(dict):
    doc_id = 1


GENERIC_MESSAGE = "Si esa direccion esta registrada, recibiras un enlace en breve."


def test_forgot_password_camino_exitoso(client, monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "test-key")
    monkeypatch.setattr(routes, "get_user_by_email", lambda email: {"id": "1", "email": email})
    inserted = []
    sent = []
    monkeypatch.setattr(routes.reset_tokens_table, "insert", lambda data: inserted.append(data))
    monkeypatch.setattr(
        routes,
        "send_password_reset_email",
        lambda email, token: sent.append((email, token)),
    )

    response = client.post("/auth/forgot-password", json={"email": "a@example.com"})

    assert response.status_code == 200
    assert response.json() == {"message": GENERIC_MESSAGE}
    assert inserted[0]["used"] is False
    assert sent[0][0] == "a@example.com"
    assert sent[0][1]


def test_forgot_password_falla_si_no_hay_configuracion_de_email(
    client,
    monkeypatch,
):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.setattr(
        routes,
        "get_user_by_email",
        lambda email: pytest.fail("No debe consultar usuarios sin email configurado"),
    )

    response = client.post("/auth/forgot-password", json={"email": "a@example.com"})

    assert response.status_code == 503
    assert response.json() == {
        "detail": "El servicio de correo de recuperación no está configurado."
    }


def test_forgot_password_caso_limite_email_no_registrado(client, monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "test-key")
    monkeypatch.setattr(routes, "get_user_by_email", lambda email: None)

    response = client.post("/auth/forgot-password", json={"email": "none@example.com"})

    assert response.status_code == 200
    assert response.json() == {"message": GENERIC_MESSAGE}


def test_forgot_password_modo_fallo_sin_email(client):
    response = client.post("/auth/forgot-password", json={})

    assert response.status_code == 422


def test_reset_password_camino_exitoso(client, monkeypatch):
    token = FakeResetToken({
        "user_id": "1",
        "token_hash": routes.hash_reset_token("raw"),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "used": False,
    })
    monkeypatch.setattr(routes.reset_tokens_table, "get", lambda query: token)
    monkeypatch.setattr(routes, "get_user_by_id", lambda user_id: {"id": "1"})
    monkeypatch.setattr(routes.bcrypt, "hash", lambda password: "hash")
    monkeypatch.setattr("app.auth.services.update_user", lambda user_id, data: None)
    updates = []
    monkeypatch.setattr(routes.reset_tokens_table, "update", lambda data, doc_ids: updates.append(doc_ids))

    response = client.post("/auth/reset-password", json={"token": "raw", "new_password": "new-password"})

    assert response.status_code == 200
    assert updates == [[1]]


def test_reset_password_caso_limite_password_corta(client):
    response = client.post("/auth/reset-password", json={"token": "raw", "new_password": "short"})

    assert response.status_code == 422


def test_reset_password_modo_fallo_token_invalido(client, monkeypatch):
    monkeypatch.setattr(routes.reset_tokens_table, "get", lambda query: None)

    response = client.post("/auth/reset-password", json={"token": "bad", "new_password": "new-password"})

    assert response.status_code == 400