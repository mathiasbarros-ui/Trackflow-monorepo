import argparse
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

from tinydb import TinyDB

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from packages.shared.incident_rules import validate_incident_data


DEFAULT_CSV_PATH = REPO_ROOT / "auth-fullstack" / "backend" / "data" / "incidents_history.csv"
INCIDENTS_DB_PATH = REPO_ROOT / "services" / "trackflow-api" / "database" / "incidents.json"
INCIDENTS_TABLE = "incidents"

STATUS_ALIASES = {
    "abierta": "open",
    "abierto": "open",
    "open": "open",
    "en curso": "in_progress",
    "en_curso": "in_progress",
    "in_progress": "in_progress",
    "resuelta": "resolved",
    "resuelto": "resolved",
    "resolved": "resolved",
    "descartada": "discarded",
    "descartado": "discarded",
    "discarded": "discarded",
}

CATEGORY_ALIASES = {
    "atencion al cliente": "atencion_cliente",
    "atencion_cliente": "atencion_cliente",
    "infra": "infraestructura",
}

BRANCH_ALIASES = {
    "centro": "sucursal_centro",
    "central": "central",
    "norte": "sucursal_norte",
    "sur": "sucursal_sur",
    "sucursal centro": "sucursal_centro",
    "sucursal_centro": "sucursal_centro",
    "sucursal norte": "sucursal_norte",
    "sucursal_norte": "sucursal_norte",
    "sucursal sur": "sucursal_sur",
    "sucursal_sur": "sucursal_sur",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Carga incidencias historicas desde un CSV al backend TrackFlow."
    )
    parser.add_argument(
        "csv_path",
        nargs="?",
        default=str(DEFAULT_CSV_PATH),
        help="Ruta del CSV historico de incidencias.",
    )
    return parser.parse_args()


def value_from(row: dict[str, str], *keys: str, default: str = "") -> str:
    for key in keys:
        value = row.get(key)
        if value:
            return value.strip()

    return default


def normalize_token(value: str) -> str:
    return value.strip().lower().replace("-", "_")


def normalize_category(value: str) -> str:
    token = normalize_token(value).replace(" ", "_")
    readable_token = normalize_token(value).replace("_", " ")
    return CATEGORY_ALIASES.get(readable_token, token)


def normalize_status(value: str) -> str:
    token = normalize_token(value).replace("_", " ")
    return STATUS_ALIASES.get(token, normalize_token(value))


def normalize_branch(value: str) -> str:
    token = normalize_token(value).replace("_", " ")
    return BRANCH_ALIASES.get(token, normalize_token(value))


def normalized_row(row: dict[str, str], incident_id: int) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    clean_data = validate_incident_data(
        title=value_from(row, "title", "titulo"),
        description=value_from(row, "description", "descripcion", "detalle", "resumen"),
        category=normalize_category(value_from(row, "category", "categoria")),
        status=normalize_status(value_from(row, "status", "estado", default="open")),
        origin=value_from(row, "origin", "origen", default="customer"),
        branch=normalize_branch(value_from(row, "branch", "sede", "sucursal", default="central")),
    )
    created_at = value_from(row, "created_at", "fecha", "fecha_creacion", default=now)
    updated_at = value_from(row, "updated_at", "fecha_actualizacion", default=created_at)

    return {
        "id": incident_id,
        **clean_data,
        "reported_by_user_id": row.get("reported_by_user_id") or None,
        "legacy_id": row.get("legacy_id") or row.get("id") or None,
        "created_at": created_at,
        "updated_at": updated_at,
    }


def load_incidents(csv_path: Path) -> int:
    if not csv_path.exists():
        raise FileNotFoundError(f"No se encontro el CSV historico: {csv_path}")

    INCIDENTS_DB_PATH.parent.mkdir(exist_ok=True)

    with csv_path.open(newline="", encoding="utf-8-sig") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = list(reader)

    normalized_rows = [
        normalized_row(row, index)
        for index, row in enumerate(rows, start=1)
    ]

    db = TinyDB(INCIDENTS_DB_PATH)
    try:
        incidents_table = db.table(INCIDENTS_TABLE)
        existing = incidents_table.all()
        next_id = 1 if not existing else max(incident["id"] for incident in existing) + 1

        for offset, row in enumerate(normalized_rows):
            incidents_table.insert(
                {
                    **row,
                    "id": next_id + offset,
                }
            )

        return len(normalized_rows)
    finally:
        db.close()


def main() -> int:
    args = parse_args()

    try:
        count = load_incidents(Path(args.csv_path))
    except (FileNotFoundError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1

    print(f"Incidencias cargadas: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())