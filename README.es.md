# TrackFlow

Monorepo de TrackFlow para operaciones de ultima milla, proveedores y herramientas internas.

## Aplicaciones

- `services/trackflow-api/`: API FastAPI unificada para auth, usuarios, perfiles, proveedores e incidencias.
- `uis/backoffice/`: backoffice Next.js con autenticacion, perfiles, proveedores y gestion de incidencias.
- `uis/website/`: portal publico Next.js con acceso al backoffice y estado de la API.
- `scripts/seed_incidents.py`: script de carga CSV para incidencias historicas.
- `data/`: datasets, pipelines y evaluacion.
- `agents/`, `skills/`, `mcps/` y `workflows/`: automatizacion y capacidades de IA.
- `packages/shared/`: reglas compartidas de validacion de incidencias y contratos.

## Desarrollo con Docker

Requisitos: Docker Engine/Docker Desktop y Docker Compose 2.24 o superior.
Desde la raiz del repositorio:

```bash
docker compose up
```

- Website: http://localhost:3000
- Backoffice: http://localhost:3001
- API y Swagger: http://localhost:8000/docs

El contenedor `interfaces` ejecuta las dos aplicaciones con `next dev`.
El contenedor `backend` ejecuta FastAPI con `uvicorn --reload`. Los cambios
en `uis/`, `services/` y `packages/` se montan desde el host. Las dependencias
y caches de cada frontend viven en volumenes independientes; los datos del
backend persisten en el volumen `backend_database`.

El archivo raiz `.env` esta ignorado por Git. Para personalizar un clon nuevo:

```bash
cp .env.example .env
```

Sin `.env`, Compose usa `.env.example`, que contiene solo valores publicos de
desarrollo. La API genera una clave JWT aleatoria y persistente si `JWT_SECRET`
esta vacia. Nunca agregues secretos a los Dockerfiles, Compose o `.env.example`.
El envio de correos requiere configurar `RESEND_API_KEY` y `EMAIL_FROM` en `.env`.

La conexion interna usa `BACKEND_API_URL=http://backend:8000` en la red
`trackflow-development`, nunca `localhost`. `NEXT_PUBLIC_BACKOFFICE_URL`,
`FRONTEND_URL` y `CORS_ORIGINS` son direcciones para el navegador, no conexiones
entre contenedores. Si cambias los puertos o usas Codespaces, actualiza tambien
esas URLs y `BACKEND_API_URL` en `.env`.

Para aplicar cambios de entorno: `docker compose up --force-recreate`.
Para reconstruir tras cambiar dependencias: `docker compose up --build`.
El script de interfaces ejecuta `npm ci` en cada arranque para sincronizar
ambos lockfiles con sus volumenes de dependencias.
Para detener sin borrar datos: `docker compose down`.
`docker compose down -v` elimina todos los volumenes, los datos y la clave JWT.

## Desarrollo local

Backend:

```bash
source .venv-1/bin/activate
cd services/trackflow-api
uvicorn main:app --reload --port 8000
```

Frontend, en otra terminal:

```bash
cd uis/backoffice
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
