from pathlib import Path
from tinydb import TinyDB


BACKEND_DIR = Path(__file__).resolve().parents[2]
DATABASE_STORAGE_DIR = BACKEND_DIR / "database"
DATABASE_FILE_PATH = DATABASE_STORAGE_DIR / "trackflow_db.json"

DATABASE_STORAGE_DIR.mkdir(exist_ok=True)

db = TinyDB(DATABASE_FILE_PATH)

users_table = db.table("users")
profiles_table = db.table("profiles")
reset_tokens_table = db.table("reset_tokens")
