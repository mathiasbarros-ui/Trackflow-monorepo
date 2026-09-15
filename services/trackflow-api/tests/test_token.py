from app.auth import routes


def test_token_camino_exitoso(client, monkeypatch):
    monkeypatch.setattr(routes, "authenticate_user", lambda email, password: {"id": "1"})
    monkeypatch.setattr(routes, "create_access_token", lambda user_id: "token")

    response = client.post("/auth/token", data={"username": "a@example.com", "password": "password"})

    assert response.status_code == 200
    assert response.json() == {"access_token": "token", "token_type": "bearer"}


def test_token_caso_limite_formulario_incompleto(client):
    response = client.post("/auth/token", data={"username": "a@example.com"})

    assert response.status_code == 422


def test_token_modo_fallo(client, monkeypatch):
    monkeypatch.setattr(routes, "authenticate_user", lambda email, password: None)

    response = client.post("/auth/token", data={"username": "a@example.com", "password": "bad"})

    assert response.status_code == 401