# Frontend TrackFlow

Backoffice de TrackFlow construido con Next.js, TypeScript y App Router.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- El backend de TrackFlow ejecutandose en el puerto 8000.

Comprueba las versiones instaladas:

```bash
node --version
npm --version
```

## Primera instalacion

Desde la raiz del repositorio:

```bash
cd frontend
npm install
```

El archivo `package-lock.json` fija las versiones instaladas. En integracion
continua o para una instalacion completamente reproducible puedes usar
`npm ci` en lugar de `npm install`.

## Configurar la API

Por defecto no necesitas crear ningun archivo: el proxy de Next apunta a
`http://127.0.0.1:8000`.

Para usar otro host o puerto, crea `frontend/.env.local`:

```env
BACKEND_API_URL=http://127.0.0.1:8000
```

`BACKEND_API_URL` se usa solo en el servidor de Next y no se expone al
navegador. Reinicia Next despues de modificar `.env.local`.

## Iniciar el frontend

Primero deja el backend ejecutandose. Después abre otra terminal y, desde la
raiz del repositorio, ejecuta:

```bash
cd frontend
npm run dev
```

No cierres esa terminal mientras uses la aplicacion. Abre:

```text
http://localhost:3000
```

El route handler `/backend/[...path]` reenvia las solicitudes a la API FastAPI.
Puedes comprobar la integracion con:

```bash
curl http://localhost:3000/backend/suppliers
```

## Compilar para produccion

```bash
cd frontend
npm run build
npm run start
```

`npm run build` valida TypeScript y genera la aplicacion optimizada.

## Problemas comunes

- `ECONNREFUSED` o respuestas `500` desde `/backend/*`: inicia primero FastAPI
  en `http://localhost:8000`.
- El puerto 3000 esta ocupado: detén el proceso anterior con `Ctrl+C` o inicia
  temporalmente con `npm run dev -- -p 3001`.
- Cambiaste `BACKEND_API_URL` y no se aplica: reinicia el proceso de Next.
- Faltan modulos de Node: ejecuta `npm install` dentro de `frontend/`.

## Funcionalidad

- Registro, login y sesion global con Context + `useReducer`.
- Rutas protegidas, perfil y cambio de contraseña.
- Recuperacion de contraseña por email.
- Directorio y gestion de proveedores.
