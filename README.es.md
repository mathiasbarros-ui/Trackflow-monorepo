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

En Codespaces, el arranque de las interfaces convierte automaticamente las URLs
locales con puerto de `NEXT_PUBLIC_BACKOFFICE_URL` y `NEXT_PUBLIC_WEBSITE_URL`
en sus direcciones HTTPS reenviadas. Las URLs publicas explicitas se conservan.
Asi los enlaces de registro, inicio de sesion y regreso al sitio no apuntan al
`localhost` del navegador.

### Website y acceso de clientes

El website (puerto 3000) incluye registro, inicio de sesion, perfil editable,
cierre de sesion y el formulario `/incidents/new`. Los usuarios comunes quedan
en el website; los administradores van al backoffice (puerto 3001). El login
del backoffice tambien deriva a los usuarios comunes al website conservando
su sesion. El traspaso entre sitios usa POST y una cookie temporal HttpOnly;
el token no se incluye en el enlace.

Las incidencias del website se guardan en la API con el usuario reportante,
origen `customer` y estado `open`, y muestran su numero de referencia.
La consulta global, el resumen y los cambios de estado siguen limitados a
administradores. El perfil usa `/profiles/me` y cerrar sesion elimina el
token del navegador del sitio actual.

### Superadmin: usuarios y conexiones

En el backoffice, `/admin` permite gestionar roles y estados de cuentas y ver
intentos de inicio de sesion exitosos y fallidos. Solo accede el rol
`superadmin`; `admin` conserva el acceso operativo, pero no puede gestionar
roles ni estados. Para promover una cuenta activa existente:

```bash
docker compose exec backend python promote_superadmin.py tu-email@ejemplo.com
docker compose restart backend
```

Vuelve a iniciar sesion: aparecera **Usuarios y accesos**. No se asigna
superadmin automaticamente. El historial empieza al habilitar la funcion;
no representa conexiones en vivo ni contiene contrasenas o tokens.
Consulta el [contrato y las protecciones](services/trackflow-api/README.md#panel-exclusivo-de-superadmin).

Para aplicar cambios de entorno: `docker compose up --force-recreate`.
Para reconstruir tras cambiar dependencias: `docker compose up --build`.
El script de interfaces ejecuta `npm ci` en cada arranque para sincronizar
ambos lockfiles con sus volumenes de dependencias.
Para detener sin borrar datos: `docker compose down`.
`docker compose down -v` elimina todos los volumenes, los datos y la clave JWT.

### Inicio rapido: datos de ejemplo

Con los servicios levantados mediante `docker compose up`, crea primero un
usuario desde `http://localhost:8000/docs`, usando `POST /users`. Copia el valor
de `user.id` en la respuesta y reemplaza `USER_UUID` en
`services/trackflow-api/routers/seed.py` por ese UUID.

Desde la raiz del repositorio, carga proveedores e inventario:

```bash
docker compose exec backend python -m app.suppliers.seed
docker compose exec -w /workspace/services/trackflow-api backend python -m routers.seed
```

El seed de proveedores omite los proveedores que ya existen. El de inventario
crea productos y movimientos, y omite esa carga si ya encuentra algun SKU.

Las cuentas nuevas se registran como usuarios y no pueden entrar al backoffice.
Para habilitar el primer administrador, desde un entorno confiable ejecuta:

```bash
docker compose exec backend python /workspace/services/trackflow-api/promote_admin.py admin@example.com
```

El usuario indicado debe haberse registrado previamente. Los admins pueden
asignar o quitar roles desde la API de usuarios.
También genera una incidencia de ejemplo una sola vez, aunque el inventario ya
estuviera cargado. Para incidencias historicas se necesita un CSV; el comando
local esta en la seccion «Carga historica de incidencias».

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

## Despliegue en DigitalOcean

La [guia de produccion](./infra/production/README.es.md) describe el VPS con IP
publica reservada, HTTPS, backups y despliegue automatico desde `main` mediante
GitHub Actions. Usa imagenes y Compose independientes del entorno de desarrollo.
Requiere configurar el servidor, los dominios y los secretos antes de activarlo.
Para el paso posterior a crear el VPS, usar la
[guia de claves y API keys](./infra/production/README.claves.es.md).

## Configuracion de desarrollo

Copia `services/trackflow-api/.env.example` a `services/trackflow-api/.env` y define al menos `JWT_SECRET`. Para recuperar contrasenas por email configura tambien `RESEND_API_KEY`, `EMAIL_FROM` y `FRONTEND_URL`.

El contexto corporativo debe mantenerse en `CONTEXT.es.md` y `CONTEXT.md`.

_English instructions are available in [README.md](./README.md)._
