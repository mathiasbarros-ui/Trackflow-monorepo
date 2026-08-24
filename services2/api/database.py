from pathlib import Path
from tinydb import TinyDB


BASE_DIR = Path(__file__).resolve().parent
DATABASE_STORAGE_DIR = BASE_DIR / "database"
DATABASE_FILE_PATH = DATABASE_STORAGE_DIR / "trackflow_db.json"

DATABASE_STORAGE_DIR.mkdir(exist_ok=True)

db = TinyDB(DATABASE_FILE_PATH)

users_table = db.table("users")
profiles_table = db.table("profiles")
