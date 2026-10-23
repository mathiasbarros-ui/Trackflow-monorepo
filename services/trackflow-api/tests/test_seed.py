from tinydb import TinyDB

from routers import seed as inventory_seed


def test_seed_demo_incident_is_idempotent(tmp_path, monkeypatch):
    database_path = tmp_path / "incidents.json"

    def get_incidents_table():
        db = TinyDB(database_path)
        return db, db.table("incidents")

    monkeypatch.setattr(
        inventory_seed,
        "get_incidents_table",
        get_incidents_table,
    )

    assert inventory_seed.seed_demo_incident() is True
    assert inventory_seed.seed_demo_incident() is False

    db = TinyDB(database_path)
    try:
        incidents = db.table("incidents").all()
    finally:
        db.close()

    assert len(incidents) == 1
    assert incidents[0]["legacy_id"] == inventory_seed.DEMO_INCIDENT_KEY
    assert incidents[0]["category"] == "pedidos"
    assert incidents[0]["status"] == "open"
