from pathlib import Path

from tinydb import TinyDB
from tinydb.table import Table


BACKEND_DIR = Path(__file__).resolve().parents[2]
SUPPLIERS_DB = BACKEND_DIR / "database" / "suppliers.json"
SUPPLIERS_table = "suppliers"


def get_suppliers_db() -> TinyDB:
    SUPPLIERS_DB.parent.mkdir(exist_ok=True)
    return TinyDB(SUPPLIERS_DB)


def get_suppliers_table() -> tuple[TinyDB, Table]:
    db = get_suppliers_db()
    return db, db.table(SUPPLIERS_table)
