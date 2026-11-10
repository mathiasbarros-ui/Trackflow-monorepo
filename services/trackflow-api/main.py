import json
import os
import sys
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import inspect, text
from sqlmodel import SQLModel

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.auth.database import engine
from app.auth.admin import router as admin_router
from app.auth.profiles import router as profiles_router
from app.auth.routes import require_admin_user, router as auth_router
from app.auth.users import router as users_router
from app.incidents.routes import router as incidents_router
from app.suppliers.routes import router as suppliers_router
import models
from routers.inventory import router as inventory_router
from routers.knowledge import router as knowledge_router


try:
    from packages.incidents_analysis import analyze_csv_text, summary_to_csv
except ModuleNotFoundError:
    analyze_csv_text = None
    summary_to_csv = None


app = FastAPI(
    title="TrackFlow API",
    version="1.0.0",
    swagger_ui_parameters={"docExpansion": "none"},
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=json.loads(
        os.getenv("CORS_ORIGINS", '["http://localhost:3000"]')),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(incidents_router)
app.include_router(suppliers_router)
app.include_router(knowledge_router)


LAST_ANALYSIS = None

SQLModel.metadata.create_all(engine)


def ensure_inventory_schema(database_engine):
    with database_engine.begin() as connection:
        columns = {
            column["name"]
            for column in inspect(connection).get_columns("sku")
        }
        if "is_active" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE sku "
                    "ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE"
                )
            )


ensure_inventory_schema(engine)

app.include_router(inventory_router)


@app.get("/", include_in_schema=False)
def home():
    return {
        "service": "TrackFlow API",
        "docs": "/docs",
        "suppliers": "/suppliers",
    }


@app.post("/api/incidents/analyze")
async def analyze_incidents(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin_user),
):
    if analyze_csv_text is None:
        raise HTTPException(
            status_code=501,
            detail="Modulo de analisis de incidencias no disponible.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400, detail="El fichero no tiene nombre.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=415,
            detail="El fichero debe tener extension .csv.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="El fichero esta vacio.")

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise HTTPException(
            status_code=400,
            detail="El fichero debe utilizar codificacion UTF-8.",
        ) from error

    try:
        result = analyze_csv_text(text=text, source_file=file.filename)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    global LAST_ANALYSIS
    LAST_ANALYSIS = result
    return result


@app.get(
    "/api/incidents/results/export",
    response_class=Response,
    responses={
        200: {
            "content": {
                "text/csv": {
                    "schema": {"type": "string", "format": "binary"},
                },
            },
        },
    },
)
def export_results(current_user: dict = Depends(require_admin_user)):
    if summary_to_csv is None:
        raise HTTPException(
            status_code=501,
            detail="Modulo de analisis de incidencias no disponible.",
        )

    if LAST_ANALYSIS is None:
        raise HTTPException(
            status_code=404,
            detail="Todavia no existe ningun analisis para exportar.",
        )

    return Response(
        content=summary_to_csv(LAST_ANALYSIS),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="results.csv"'
        },
    )
