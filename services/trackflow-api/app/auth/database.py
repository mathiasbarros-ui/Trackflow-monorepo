from pathlib import Path
from tinydb import TinyDB
import os
from dotenv import load_dotenv
from sqlmodel import Session, create_engine


BACKEND_DIR = Path(__file__).resolve().parents[2]
DATABASE_STORAGE_DIR = BACKEND_DIR / "database"
DATABASE_FILE_PATH = DATABASE_STORAGE_DIR / "trackflow_db.json"

DATABASE_STORAGE_DIR.mkdir(exist_ok=True)

db = TinyDB(DATABASE_FILE_PATH)

users_table = db.table("users")
profiles_table = db.table("profiles")
reset_tokens_table = db.table("reset_tokens")

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está configurada")

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

def get_db():
    with Session(engine) as session:
        yield session
