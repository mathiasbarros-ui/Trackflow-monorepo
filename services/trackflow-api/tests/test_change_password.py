from app.auth import routes


def test_change_password_camino_exitoso(auth_client, monkeypatch):
    monkeypatch.setattr(routes.bcrypt, "verify", lambda password, hashed: True)
    monkeypatch.setattr(routes.bcrypt, "hash", lambda password: "new-hash")
    changes = []
    monkeypatch.setattr("app.auth.services.update_user", lambda user_id, data: changes.append(data))

    response = auth_client.post(
        "/auth/change-password",
        json={"current_password": "old", "new_password": "new-password"},
    )

    assert response.status_code == 200
    assert changes == [{"hashed_password": "new-hash"}]


def test_change_password_caso_limite_password_corta(auth_client):
    response = auth_client.post(
        "/auth/change-password",
        json={"current_password": "old", "new_password": "short"},
    )

    assert response.status_code == 422


def test_change_password_modo_fallo(auth_client, monkeypatch):
    monkeypatch.setattr(routes.bcrypt, "verify", lambda password, hashed: False)

    response = auth_client.post(
        "/auth/change-password",
        json={"current_password": "bad", "new_password": "new-password"},
    )

    assert response.status_code == 400