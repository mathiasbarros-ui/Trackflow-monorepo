from app.auth import profiles


def test_profile_get_camino_exitoso(auth_client, monkeypatch):
    profile = {"user_id": "user-1", "name": "Ana"}
    monkeypatch.setattr(profiles, "get_profile_by_user_id", lambda user_id: profile)

    response = auth_client.get("/profiles/me")

    assert response.status_code == 200
    assert response.json() == profile


def test_profile_get_caso_limite_campos_vacios(auth_client, monkeypatch):
    profile = {"user_id": "user-1", "name": None, "phone": None, "address": None}
    monkeypatch.setattr(profiles, "get_profile_by_user_id", lambda user_id: profile)

    response = auth_client.get("/profiles/me")

    assert response.status_code == 200
    assert response.json() == profile


def test_profile_get_modo_fallo_sin_perfil(auth_client, monkeypatch):
    monkeypatch.setattr(profiles, "get_profile_by_user_id", lambda user_id: None)

    response = auth_client.get("/profiles/me")

    assert response.status_code == 404


def test_profile_put_camino_exitoso(auth_client, monkeypatch):
    calls = []
    monkeypatch.setattr(profiles, "update_profile", lambda user_id, data: calls.append(data) or data)

    response = auth_client.put("/profiles/me", json={"name": "Ana", "phone": "123"})

    assert response.status_code == 200
    assert calls == [{"name": "Ana", "phone": "123"}]


def test_profile_put_caso_limite_cuerpo_vacio(auth_client, monkeypatch):
    calls = []
    monkeypatch.setattr(profiles, "update_profile", lambda user_id, data: calls.append(data) or {})

    response = auth_client.put("/profiles/me", json={})

    assert response.status_code == 200
    assert calls == [{}]


def test_profile_put_modo_fallo_sin_autenticacion(client):
    response = client.put("/profiles/me", json={"name": "Ana"})

    assert response.status_code == 401