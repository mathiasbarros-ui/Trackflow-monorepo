from app.auth import routes


def test_me_camino_exitoso(auth_client, monkeypatch):
    monkeypatch.setattr(routes, "get_profile_by_user_id", lambda user_id: {"name": "Ana"})

    response = auth_client.get("/auth/me")

    assert response.status_code == 200
    assert response.json()["profile"] == {"name": "Ana"}


def test_me_caso_limite_sin_perfil(auth_client, monkeypatch):
    monkeypatch.setattr(routes, "get_profile_by_user_id", lambda user_id: None)

    response = auth_client.get("/auth/me")

    assert response.status_code == 200
    assert response.json()["profile"] is None


def test_me_modo_fallo_sin_autenticacion(client):
    response = client.get("/auth/me")

    assert response.status_code == 401