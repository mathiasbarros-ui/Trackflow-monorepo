from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.auth.profiles import router as profiles_router
from app.auth.routes import router as auth_router
from app.auth.users import router as users_router
from app.suppliers.routes import router as suppliers_router

try:
    from packages.incidents_analysis import analyze_csv_text, summary_to_csv
except ModuleNotFoundError:
    analyze_csv_text = None
    summary_to_csv = None


app = FastAPI(
    title="TrackFlow API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(auth_router)
app.include_router(suppliers_router)


LAST_ANALYSIS = None


@app.get("/")
def home():
    return {
        "message": "TrackFlow API funcionando"
    }


@app.post("/api/incidents/analyze")
async def analyze_incidents(file: UploadFile = File(...)):
    if analyze_csv_text is None:
        raise HTTPException(
            status_code=501,
            detail="Modulo de analisis de incidencias no disponible.",
        )

    if not file.filename:
        raise HTTPException(status_code=400, detail="El fichero no tiene nombre.")

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


@app.get("/api/incidents/results/export")
def export_results():
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
