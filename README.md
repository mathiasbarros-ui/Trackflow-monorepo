# TrackFlow

TrackFlow monorepo for last-mile operations, suppliers, and internal tools.

## Applications

- `services/trackflow-api/`: unified FastAPI API for auth, users, profiles, suppliers, and incidents.
- `uis/trackflow-ui/`: Next.js backoffice with authentication, profiles, suppliers, and incident management.
- `scripts/seed_incidents.py`: CSV seed script for historical incidents.
- `data/`: datasets, pipelines, and evaluation.
- `agents/`, `skills/`, `mcps/`, and `workflows/`: automation and AI capabilities.
- `packages/shared/`: shared incident validation rules and contracts.

## Local development

Backend:

```bash
source .venv-1/bin/activate
cd services/trackflow-api
uvicorn main:app --reload --port 8000
```

Frontend, in another terminal:

```bash
cd uis/trackflow-ui
npm install
npm run dev
```

Historical incident seed:

```bash
python scripts/seed_incidents.py path/to/incidents_history.csv
```

Open:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Configuration

Copy `services/trackflow-api/.env.example` to `services/trackflow-api/.env` and set at least `JWT_SECRET`. To enable password recovery email, also configure `RESEND_API_KEY`, `EMAIL_FROM`, and `FRONTEND_URL`.

Keep the company context in `CONTEXT.es.md` and `CONTEXT.md`.

_Las instrucciones en espanol estan disponibles en [README.es.md](./README.es.md)._
