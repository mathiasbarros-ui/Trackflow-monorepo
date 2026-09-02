# TrackFlow

TrackFlow monorepo for last-mile operations, suppliers, and internal tools.

## Applications

- `frontend/`: Next.js backoffice with authentication, profiles, and supplier management.
- `backend/`: unified FastAPI API for auth, users, profiles, suppliers, and incidents.
- `data/`: datasets, pipelines, and evaluation.
- `agents/`, `skills/`, `mcps/`, and `workflows/`: automation and AI capabilities.
- `packages/` and `shared/`: shared code and contracts.

## Local development

Backend:

```bash
source .venv-1/bin/activate
cd backend
uvicorn main:app --reload --port 8000
```

Frontend, in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Configuration

Copy `backend/.env.example` to `backend/.env` and set at least `JWT_SECRET`. To enable password recovery email, also configure `RESEND_API_KEY`, `EMAIL_FROM`, and `FRONTEND_URL`.

Keep the company context in `CONTEXT.es.md` and `CONTEXT.md`.

_Las instrucciones en espanol estan disponibles en [README.es.md](./README.es.md)._
