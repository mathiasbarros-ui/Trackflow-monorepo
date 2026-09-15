from app.auth import users


def test_register_camino_exitoso(client, monkeypatch):
    monkeypatch.setattr(users, "get_user_by_email", lambda email: None)
    monkeypatch.setattr(users, "create_user", lambda user, profile: None)
    monkeypatch.setattr(users.bcrypt, "hash", lambda password: "hash")
    monkeypatch.setattr(users, "create_access_token", lambda user_id: "token")

    response = client.post("/users", json={"email": "new@example.com", "password": "12345678"})

    assert response.status_code == 200
    assert response.json()["access_token"] == "token"


def test_register_caso_limite_password_minima(client, monkeypatch):
    monkeypatch.setattr(users, "get_user_by_email", lambda email: None)
    monkeypatch.setattr(users, "create_user", lambda user, profile: None)
    monkeypatch.setattr(users.bcrypt, "hash", lambda password: "hash")
    monkeypatch.setattr(users, "create_access_token", lambda user_id: "token")

    response = client.post("/users", json={"email": "new@example.com", "password": "12345678"})

    assert response.status_code == 200


def test_register_modo_fallo_email_duplicado(client, monkeypatch):
    monkeypatch.setattr(users, "get_user_by_email", lambda email: {"id": "existing"})

    response = client.post("/users", json={"email": "existing@example.com", "password": "12345678"})

    assert response.status_code == 400


def test_list_camino_exitoso(auth_client, monkeypatch):
    user = {"id": "1", "email": "a@example.com", "is_active": True, "role": "user", "created_at": "now"}
    monkeypatch.setattr(users, "get_all_users", lambda: [user])

    response = auth_client.get("/users")

    assert response.status_code == 200
    assert response.json() == [user]


def test_list_caso_limite_vacia(auth_client, monkeypatch):
    monkeypatch.setattr(users, "get_all_users", lambda: [])

    response = auth_client.get("/users")

    assert response.status_code == 200
    assert response.json() == []


def test_list_modo_fallo_sin_autenticacion(client):
    response = client.get("/users")

    assert response.status_code == 401


def test_get_camino_exitoso(auth_client, current_user, monkeypatch):
    monkeypatch.setattr(users, "get_user_by_id", lambda user_id: current_user)

    response = auth_client.get("/users/user-1")

    assert response.status_code == 200
    assert response.json()["id"] == "user-1"


def test_get_caso_limite_no_existe(auth_client, monkeypatch):
    monkeypatch.setattr(users, "get_user_by_id", lambda user_id: None)

    response = auth_client.get("/users/user-1")

    assert response.status_code == 404


def test_get_modo_fallo_sin_permiso(auth_client):
    response = auth_client.get("/users/other")

    assert response.status_code == 403


def test_put_camino_exitoso(auth_client, current_user, monkeypatch):
    monkeypatch.setattr(users, "get_user_by_id", lambda user_id: current_user)
    monkeypatch.setattr(users, "update_user", lambda user_id, data: current_user | data)

    response = auth_client.put("/users/user-1", json={"is_active": False})

    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_put_caso_limite_cuerpo_vacio(auth_client, current_user, monkeypatch):
    monkeypatch.setattr(users, "get_user_by_id", lambda user_id: current_user)
    monkeypatch.setattr(users, "update_user", lambda user_id, data: current_user)

    response = auth_client.put("/users/user-1", json={})

    assert response.status_code == 200


def test_put_modo_fallo_sin_permiso(auth_client):
    response = auth_client.put("/users/other", json={"is_active": False})

    assert response.status_code == 403


def test_delete_camino_exitoso(auth_client, monkeypatch):
    monkeypatch.setattr(users, "get_user_by_id", lambda user_id: {"id": user_id})
    deleted = []
    monkeypatch.setattr(users, "delete_user", lambda user_id: deleted.append(user_id))

    response = auth_client.delete("/users/user-1")

    assert response.status_code == 200
    assert deleted == ["user-1"]


def test_delete_caso_limite_no_existe(auth_client, monkeypatch):
    monkeypatch.setattr(users, "get_user_by_id", lambda user_id: None)

    response = auth_client.delete("/users/user-1")

    assert response.status_code == 404


def test_delete_modo_fallo_sin_permiso(auth_client):
    response = auth_client.delete("/users/other")

    assert response.status_code == 403