from app.auth import routes


def test_login_camino_exitoso(client, monkeypatch):
    user = {"id": "1", "email": "a@example.com", "role": "user"}
    monkeypatch.setattr(routes, "authenticate_user", lambda email, password: user)
    monkeypatch.setattr(routes, "create_access_token", lambda user_id: "token")
    monkeypatch.setattr(routes, "get_profile_by_user_id", lambda user_id: {"name": "Ana"})

    response = client.post("/auth/login", json={"email": user["email"], "password": "password"})

    assert response.status_code == 200
    assert response.json()["access_token"] == "token"
    assert response.json()["profile"] == {"name": "Ana"}


def test_login_caso_limite_sin_campos(client):
    response = client.post("/auth/login", json={})

    assert response.status_code == 422


def test_login_modo_fallo(client, monkeypatch):
    monkeypatch.setattr(routes, "authenticate_user", lambda email, password: None)

    response = client.post("/auth/login", json={"email": "a@example.com", "password": "bad"})

    assert response.status_code == 401