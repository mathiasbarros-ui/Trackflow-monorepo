import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import create_engine

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.auth import routes
from main import app
from app.auth import admin, login_history


class FakeResetToken(dict):
    doc_id = 1


GENERIC_MESSAGE = "Si esa direccion esta registrada, recibiras un enlace en breve."


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def current_user():
    return {
        "id": "user-1",
        "email": "user@example.com",
        "hashed_password": "hashed",
        "role": "user",
        "is_active": True,
        "created_at": "2026-01-01T00:00:00+00:00",
    }


@pytest.fixture
def auth_client(current_user):
    app.dependency_overrides[routes.get_current_user] = lambda: current_user
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def admin_client(current_user):
    admin_user = {**current_user, "role": "admin"}
    app.dependency_overrides[routes.get_current_user] = lambda: admin_user
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def superadmin_client(current_user):
    app.dependency_overrides[routes.get_current_user] = lambda: {
        **current_user, "id": "super-1", "role": "superadmin",
    }
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def isolated_login_history(monkeypatch, tmp_path):
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'login-history.db'}",
        connect_args={"check_same_thread": False},
    )
    login_history.LoginAttempt.__table__.create(test_engine)
    monkeypatch.setattr(login_history, "engine", test_engine)
    monkeypatch.setattr(admin, "engine", test_engine)
    yield test_engine
    test_engine.dispose()