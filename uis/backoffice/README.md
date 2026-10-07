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

Ejecuta los comandos desde la raiz del repositorio. La raiz del proyecto Next
es `uis/backoffice/`, donde estan `package.json` y `package-lock.json`; `src/`
contiene el codigo de la aplicacion y no es la carpeta desde la que se instala
el proyecto.

```bash
cd uis/backoffice
npm install
```

El archivo `package-lock.json` fija las versiones instaladas. En integracion
continua o para una instalacion completamente reproducible puedes usar
`npm ci` en lugar de `npm install`.

## Configurar la API

Por defecto no necesitas crear ningun archivo: el proxy de Next apunta a
`http://127.0.0.1:8000`.

Para usar otro host o puerto, crea `uis/backoffice/.env.local`:

```env
BACKEND_API_URL=http://127.0.0.1:8000
```

`BACKEND_API_URL` se usa solo en el servidor de Next y no se expone al
navegador. Reinicia Next despues de modificar `.env.local`.

## Iniciar el frontend

Primero inicia el backend siguiendo `services/trackflow-api/README.md`. Luego,
desde la raiz del repositorio, inicia el frontend:

```bash
cd uis/backoffice
npm run dev
```

Si tu terminal ya esta dentro de `uis/backoffice/src/`, puedes iniciar Next
sin cambiar de carpeta con:

```bash
npm --prefix .. run dev
```

En ambos casos npm ejecuta el script de `uis/backoffice/package.json` y Next
queda en `http://localhost:3000`.

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

Ejecuta estos comandos desde la raiz del repositorio:

```bash
cd uis/backoffice
npm run build
npm run start
```

`npm run build` valida TypeScript y genera la aplicacion optimizada.

## Problemas comunes

- `ECONNREFUSED` o respuestas `500` desde `/backend/*`: inicia primero FastAPI
  en `http://localhost:8000`.
- El puerto 3000 esta ocupado: detén el proceso anterior con `Ctrl+C` o inicia
  temporalmente desde `uis/backoffice/` con `npm run dev -- -p 3001`.
- Cambiaste `BACKEND_API_URL` y no se aplica: reinicia el proceso de Next.
- `next: not found` o faltan modulos: ejecuta `npm install` dentro de
  `uis/backoffice/`, no dentro de `src/`.

## Funcionalidad

- Registro, login y sesion global con Context + `useReducer`.
- Rutas protegidas, perfil y cambio de contraseña.
- Recuperacion de contraseña por email.
- Directorio y gestion de proveedores.
- Gestor de incidencias con registro, filtros, listado, resumen y cambio de estado.
