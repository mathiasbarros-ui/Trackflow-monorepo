# TrackFlow

TrackFlow monorepo for last-mile operations, suppliers, and internal tools.

## Applications

- `services/trackflow-api/`: unified FastAPI API for auth, users, profiles, suppliers, and incidents.
- `uis/backoffice/`: Next.js backoffice with authentication, profiles, suppliers, and incident management.
- `uis/website/`: public Next.js portal with backoffice access and API status.
- `scripts/seed_incidents.py`: CSV seed script for historical incidents.
- `data/`: datasets, pipelines, and evaluation.
- `agents/`, `skills/`, `mcps/`, and `workflows/`: automation and AI capabilities.
- `packages/shared/`: shared incident validation rules and contracts.

## Docker development

Requirements: Docker Engine/Docker Desktop and Docker Compose 2.24 or later.
From the repository root:

```bash
docker compose up
```

- Website: http://localhost:3000
- Backoffice: http://localhost:3001
- API and Swagger: http://localhost:8000/docs

The `interfaces` container runs both applications using `next dev`.
The `backend` container runs FastAPI using `uvicorn --reload`. Source changes
in `uis/`, `services/`, and `packages/` are bind-mounted. Each frontend has
separate dependency and cache volumes; backend data persists in the
`backend_database` volume.

The root `.env` file is ignored by Git. To customize a fresh clone:

```bash
cp .env.example .env
```

Without `.env`, Compose uses `.env.example`, which only contains public
development defaults. The API generates a persistent random JWT key when
`JWT_SECRET` is empty. Never put secrets in Dockerfiles, Compose, or `.env.example`.
Email delivery requires `RESEND_API_KEY` and `EMAIL_FROM` in `.env`.

Internal connections use `BACKEND_API_URL=http://backend:8000` on the
`trackflow-development` network, never `localhost`. `NEXT_PUBLIC_BACKOFFICE_URL`,
`FRONTEND_URL`, and `CORS_ORIGINS` are browser-facing addresses, not connections
between containers. When changing ports or using Codespaces, also update
those URLs and `BACKEND_API_URL` in `.env`.

Apply environment changes with `docker compose up --force-recreate`.
Rebuild after dependency changes with `docker compose up --build`.
The interfaces startup script runs `npm ci` on every start to synchronize both
lockfiles with their dependency volumes.
Stop without deleting data using `docker compose down`.
`docker compose down -v` removes all volumes, stored data, and the JWT key.

## Local development

Backend:

```bash
source .venv-1/bin/activate
cd services/trackflow-api
uvicorn main:app --reload --port 8000
```

Frontend, in another terminal:

```bash
cd uis/backoffice
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
