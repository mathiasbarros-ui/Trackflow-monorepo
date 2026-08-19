from datetime import datetime, timezone

from tinydb import Query

from services.api.database import get_suppliers_table


SEED_SUPPLIERS = [
    {
        "name": "Brasaland Steel Works",
        "country": "US",
        "category": "metals",
        "rate": 125.0,
        "status": "activo",
    },
    {
        "name": "Green Circuit Logistics",
        "country": "ES",
        "category": "logistics",
        "rate": 98.5,
        "status": "activo",
    },
    {
        "name": "Northern Components",
        "country": "US",
        "category": "electronics",
        "rate": 140.0,
        "status": "suspendido",
    },
]


supplier_query = Query()


def current_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_next_supplier_id(rows: list[dict]) -> int:
    return 1 if not rows else max(row["id"] for row in rows) + 1


def seed_suppliers() -> tuple[int, int]:
    db, suppliers_table = get_suppliers_table()
    inserted = 0
    skipped = 0

    try:
        for seed_supplier in SEED_SUPPLIERS:
            exists = suppliers_table.get(
                (supplier_query.name == seed_supplier["name"])
                & (supplier_query.country == seed_supplier["country"])
            )

            if exists:
                skipped += 1
                continue

            supplier_data = {
                "id": get_next_supplier_id(suppliers_table.all()),
                **seed_supplier,
                "updated_at": current_timestamp(),
            }
            suppliers_table.insert(supplier_data)
            inserted += 1
    finally:
        db.close()

    return inserted, skipped


def main() -> None:
    inserted, skipped = seed_suppliers()
    print(f"Seed complete. inserted={inserted}, skipped={skipped}")


if __name__ == "__main__":
    main()
