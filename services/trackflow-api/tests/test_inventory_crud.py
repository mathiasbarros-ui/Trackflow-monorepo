import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.auth.database import get_db
from app.auth.routes import get_current_user
from main import app, ensure_inventory_schema


@pytest.fixture
def inventory_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def get_test_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = get_test_db
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "user-1",
        "email": "user@example.com",
        "is_active": True,
        "role": "admin",
    }

    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_home_reports_api_and_supplier_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "service": "TrackFlow API",
        "docs": "/docs",
        "suppliers": "/suppliers",
    }


def test_product_crud_can_create_edit_and_deactivate(inventory_client):
    product = {
        "name": "Caja mediana",
        "sku": "BOX-100",
        "client_name": "Cliente Uno",
        "category": "Embalaje",
        "warehouse": "Central",
    }

    created = inventory_client.post("/inventory/products", json=product)

    assert created.status_code == 200
    created_product = created.json()
    assert created_product["is_active"] is True

    product_id = created_product["id"]
    updated = inventory_client.put(
        f"/inventory/products/{product_id}",
        json={**product, "name": "Caja grande"},
    )

    assert updated.status_code == 200
    assert updated.json()["name"] == "Caja grande"

    deactivated = inventory_client.delete(f"/inventory/products/{product_id}")

    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False
    assert inventory_client.get("/inventory/products").json() == []
    assert inventory_client.get(
        f"/inventory/products/{product_id}").status_code == 404


def test_product_mutations_require_auth(client):
    product = {
        "name": "Caja mediana",
        "sku": "BOX-100",
        "client_name": "Cliente Uno",
        "category": "Embalaje",
        "warehouse": "Central",
    }

    assert client.post("/inventory/products", json=product).status_code == 401
    assert client.put("/inventory/products/1", json=product).status_code == 401
    assert client.delete("/inventory/products/1").status_code == 401


def test_inventory_rejects_non_admin(inventory_client):
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "user-1",
        "email": "user@example.com",
        "is_active": True,
        "role": "user",
    }

    assert inventory_client.get("/inventory/products").status_code == 403


def test_existing_inventory_table_gets_active_column(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE sku (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"
        )
        connection.exec_driver_sql(
            "INSERT INTO sku (id, name) VALUES (1, 'Caja antigua')"
        )

    ensure_inventory_schema(engine)

    with engine.connect() as connection:
        product = connection.exec_driver_sql(
            "SELECT name, is_active FROM sku WHERE id = 1"
        ).one()

    assert product.name == "Caja antigua"
    assert product.is_active in (True, 1)
    engine.dispose()
