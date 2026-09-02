# TrackFlow

Monorepo de TrackFlow para operaciones de ultima milla, proveedores y herramientas internas.

## Aplicaciones

- `frontend/`: backoffice Next.js con autenticacion, perfiles y gestion de proveedores.
- `backend/`: API FastAPI unificada para auth, usuarios, perfiles, proveedores e incidencias.
- `data/`: datasets, pipelines y evaluacion.
- `agents/`, `skills/`, `mcps/` y `workflows/`: automatizacion y capacidades de IA.
- `packages/` y `shared/`: codigo y contratos compartidos.

## Desarrollo local

Backend:

```bash
source .venv-1/bin/activate
cd backend
uvicorn main:app --reload --port 8000
```

Frontend, en otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Configuracion

Copia `backend/.env.example` a `backend/.env` y define al menos `JWT_SECRET`. Para recuperar contrasenas por email configura tambien `RESEND_API_KEY`, `EMAIL_FROM` y `FRONTEND_URL`.

El contexto corporativo debe mantenerse en `CONTEXT.es.md` y `CONTEXT.md`.

_English instructions are available in [README.md](./README.md)._
