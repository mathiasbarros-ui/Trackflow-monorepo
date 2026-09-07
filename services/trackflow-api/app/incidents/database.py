from pathlib import Path

from tinydb import TinyDB
from tinydb.table import Table


BACKEND_DIR = Path(__file__).resolve().parents[2]
INCIDENTS_DB = BACKEND_DIR / "database" / "incidents.json"
INCIDENTS_TABLE = "incidents"


def get_incidents_db() -> TinyDB:
    INCIDENTS_DB.parent.mkdir(exist_ok=True)
    return TinyDB(INCIDENTS_DB)


def get_incidents_table() -> tuple[TinyDB, Table]:
    db = get_incidents_db()
    return db, db.table(INCIDENTS_TABLE)