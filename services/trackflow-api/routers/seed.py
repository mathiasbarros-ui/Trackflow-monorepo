from sqlmodel import Session, SQLModel, select

from app.auth.database import engine
from models import SKU, StockEntry, StockExit


# 1) Creá primero un usuario desde POST /auth/register.
# 2) Copiá el uuid que devuelve Swagger y pegalo acá.
USER_UUID = "2a3d3fac-fa72-428a-8a78-a34eb8321009"


def seed():
    SQLModel.metadata.create_all(engine)

    with Session(engine) as db:
        existing = db.exec(select(SKU)).first()

        if existing:
            print("Ya hay SKUs cargados. No se ejecutó el seed.")
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
