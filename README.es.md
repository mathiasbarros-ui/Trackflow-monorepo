# TrackFlow

Monorepo de TrackFlow para operaciones de ultima milla, proveedores y herramientas internas.

## Aplicaciones

- `services/trackflow-api/`: API FastAPI unificada para auth, usuarios, perfiles, proveedores e incidencias.
- `uis/trackflow-ui/`: backoffice Next.js con autenticacion, perfiles, proveedores y gestion de incidencias.
- `scripts/seed_incidents.py`: script de carga CSV para incidencias historicas.
- `data/`: datasets, pipelines y evaluacion.
- `agents/`, `skills/`, `mcps/` y `workflows/`: automatizacion y capacidades de IA.
- `packages/shared/`: reglas compartidas de validacion de incidencias y contratos.

## Desarrollo local

Backend:

```bash
source .venv-1/bin/activate
cd services/trackflow-api
uvicorn main:app --reload --port 8000
```

Frontend, en otra terminal:

```bash
cd uis/trackflow-ui
npm install
npm run dev
```

Carga historica de incidencias:

```bash
python scripts/seed_incidents.py ruta/a/incidents_history.csv
```

Abre:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Configuracion

Copia `services/trackflow-api/.env.example` a `services/trackflow-api/.env` y define al menos `JWT_SECRET`. Para recuperar contrasenas por email configura tambien `RESEND_API_KEY`, `EMAIL_FROM` y `FRONTEND_URL`.

El contexto corporativo debe mantenerse en `CONTEXT.es.md` y `CONTEXT.md`.

_English instructions are available in [README.md](./README.md)._
