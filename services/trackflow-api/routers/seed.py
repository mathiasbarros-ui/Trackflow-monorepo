from datetime import datetime, timezone
import sys
from pathlib import Path

from sqlmodel import Session, SQLModel, select
from tinydb import Query

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.auth.database import engine
from app.incidents.database import get_incidents_table
from app.incidents.rules import validate_incident_data
from models import SKU, StockEntry, StockExit


# 1) Creá primero un usuario desde POST /users.
# 2) Copiá el uuid que devuelve Swagger y pegalo acá.
USER_UUID = "2a3d3fac-fa72-428a-8a78-a34eb8321009"
DEMO_INCIDENT_KEY = "trackflow-demo-inventory-incident"
incident_query = Query()


def seed_demo_incident() -> bool:
    db, incidents_table = get_incidents_table()

    try:
        existing = incidents_table.get(
            incident_query.legacy_id == DEMO_INCIDENT_KEY
        )
        if existing:
            return False

        now = datetime.now(timezone.utc).isoformat()
        incident_data = validate_incident_data(
            title="Demora en el despacho de productos de ejemplo",
            description=(
                "El pedido de prueba no se despacho dentro del plazo esperado."
            ),
            category="pedidos",
            status="open",
            origin="internal",
            branch="central",
        )
        existing_incidents = incidents_table.all()
        incidents_table.insert({
            "id": 1 if not existing_incidents else max(
                incident["id"] for incident in existing_incidents
            ) + 1,
            **incident_data,
            "reported_by_user_id": USER_UUID,
            "legacy_id": DEMO_INCIDENT_KEY,
            "created_at": now,
            "updated_at": now,
        })
        return True
    finally:
        db.close()


def seed():
    SQLModel.metadata.create_all(engine)
    incident_inserted = seed_demo_incident()
    incident_status = "cargada" if incident_inserted else "ya existente"
    print(f"Incidencia de ejemplo {incident_status}.")

    with Session(engine) as db:
        existing = db.exec(select(SKU)).first()

        if existing:
            print("Ya hay SKUs cargados. Se omitió el seed de inventario.")
            return

        skus = [
            SKU(
                name="Zapatilla blanca clásica - Talla 42",
                sku="CLT-SNK-W-42",
                client_name="PureStep Footwear",
                category="fashion",
                warehouse="LA",
            ),
            SKU(
                name="Zapatilla blanca clásica - Talla 42",
                sku="CLT-SNK-W-42-Z",
                client_name="PureStep Footwear",
                category="fashion",
                warehouse="ZGZ",
            ),
            SKU(
                name="Auriculares inalámbricos Pro",
                sku="TEC-EAR-001",
                client_name="SoundWave Electronics",
                category="electronics",
                warehouse="LA",
            ),
            SKU(
                name="Sérum facial hidratante 30ml",
                sku="CSM-SRM-030",
                client_name="GlowLab Cosmetics",
                category="cosmetics",
                warehouse="ZGZ",
            ),
            SKU(
                name="Chino slim fit - marino 32/32",
                sku="CLT-CHN-N-32",
                client_name="UrbanThread",
                category="fashion",
                warehouse="LA",
            ),
            SKU(
                name="Cargador rápido USB-C 65W",
                sku="TEC-CHG-065",
                client_name="SoundWave Electronics",
                category="electronics",
                warehouse="ZGZ",
            ),
        ]

        db.add_all(skus)
        db.commit()

        for sku in skus:
            db.refresh(sku)

        by_sku = {item.sku: item for item in skus}

        entries = [
            StockEntry(
                sku_id=by_sku["CLT-SNK-W-42"].id,
                quantity=20,
                reference="PO-2024-0098",
                warehouse="LA",
                user_uuid=USER_UUID,
            ),
            StockEntry(
                sku_id=by_sku["CLT-SNK-W-42"].id,
                quantity=15,
                reference="GR-LA-0234",
                warehouse="LA",
                user_uuid=USER_UUID,
            ),
            StockEntry(
                sku_id=by_sku["CLT-SNK-W-42-Z"].id,
                quantity=25,
                reference="PO-ZGZ-0112",
                warehouse="ZGZ",
                user_uuid=USER_UUID,
            ),
            StockEntry(
                sku_id=by_sku["TEC-EAR-001"].id,
                quantity=12,
                reference="PO-LA-0301",
                warehouse="LA",
                user_uuid=USER_UUID,
            ),
        ]

        db.add_all(entries)
        db.commit()

        exits = [
            StockExit(
                sku_id=by_sku["CLT-SNK-W-42"].id,
                quantity=4,
                exit_type="dispatch",
                tracking_number="1Z999AA10123456784",
                warehouse="LA",
                user_uuid=USER_UUID,
            ),
            StockExit(
                sku_id=by_sku["CLT-SNK-W-42"].id,
                quantity=1,
                exit_type="loss",
                tracking_number=None,
                warehouse="LA",
                user_uuid=USER_UUID,
            ),
            StockExit(
                sku_id=by_sku["CLT-SNK-W-42-Z"].id,
                quantity=3,
                exit_type="dispatch",
                tracking_number="ZGZ-TRACK-0001",
                warehouse="ZGZ",
                user_uuid=USER_UUID,
            ),
        ]

        db.add_all(exits)
        db.commit()

        print("Seed de TrackFlow cargado correctamente.")


if __name__ == "__main__":
    seed()
