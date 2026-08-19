import os

from tinydb import TinyDB
from tinydb.table import Table


SUPPLIERS_db = "data/suppliers.json"
SUPPLIERS_table = "suppliers"


def get_suppliers_db() -> TinyDB:
    os.makedirs("data", exist_ok=True)
    return TinyDB(SUPPLIERS_db)


def get_suppliers_table() -> tuple[TinyDB, Table]:
    db = get_suppliers_db()
    return db, db.table(SUPPLIERS_table)
