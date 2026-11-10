# Backend TrackFlow

API FastAPI unificada para autenticacion, perfiles, usuarios, proveedores y
gestion y analisis de incidencias.

## Requisitos

- Python 3.11 o superior.
- `pip` disponible.

Comprueba la version instalada:

```bash
python --version
```

## Primera instalacion

Ejecuta estos comandos desde la raiz del repositorio:

```bash
cd services/trackflow-api
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
```

La raiz del backend es `services/trackflow-api/`, donde estan `main.py`,
`requirements.txt` y `.env`. Ejecuta Uvicorn desde esa carpeta para que se
cargue `.env` y la ruta relativa de SQLite apunte a `database/`.

En Windows PowerShell, activa el entorno con:

```powershell
.venv\Scripts\Activate.ps1
```

Este servicio usa el entorno `.venv` dentro de `services/trackflow-api/`.
Los comandos de esta guia no dependen de un `.venv-1` en la raiz del repo.

La plantilla configura SQLite para desarrollo y crea la base en
`database/trackflow.db`. Abre `.env` y reemplaza `JWT_SECRET` por una clave
larga y aleatoria. Puedes generarla con:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Las variables de Resend son opcionales durante el desarrollo. Sin
`RESEND_API_KEY`, registro, login, perfil y cambio de contraseña funcionan,
pero `POST /auth/forgot-password` responde con `503` porque no puede enviar el
enlace de recuperacion.

## Iniciar el backend

Cada vez que abras una terminal nueva, ejecuta desde la raiz del repositorio:

```bash
cd services/trackflow-api
source .venv/bin/activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

No cierres esa terminal mientras uses la aplicacion. El backend queda
disponible en:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- OpenAPI: `http://localhost:8000/openapi.json`

Comprueba el arranque desde otra terminal:

```bash
curl http://localhost:8000/
```

La respuesta esperada es:

```json
{ "message": "TrackFlow API funcionando" }
```

## Cargar proveedores iniciales

Con el entorno virtual activo y dentro de `services/trackflow-api/`:

```bash
seed-suppliers
```

El comando puede ejecutarse varias veces sin duplicar proveedores existentes.

## Problemas comunes

- `Address already in use`: ya existe un proceso en el puerto 8000. Detenlo
  con `Ctrl+C` en su terminal antes de iniciar otro.
- `uvicorn: command not found`: el entorno virtual no esta activo o faltan las
  dependencias; activa `.venv` y ejecuta
  `python -m pip install -r requirements.txt`.
- `ModuleNotFoundError: app`: ejecutaste Uvicorn fuera de `services/trackflow-api/`; entra en
  esa carpeta antes de iniciar el servidor.

## Modulos

- `app/auth/`: JWT, usuarios, perfiles y recuperacion de contraseña.
- `app/incidents/`: endpoints de registro, listado, resumen y cambio de estado.
- `app/suppliers/`: CRUD y seed de proveedores.
- `main.py`: aplicacion FastAPI y registro de routers.
- `database/`: persistencia local de TinyDB.

## Auth contract para frontend

Esta API ya soporta el flujo JWT para frontend React/Next.js:

- `POST /auth/login` acepta JSON (`email`, `password`) y devuelve `access_token`.
- `POST /auth/token` mantiene compatibilidad con formularios OAuth2.
- `POST /users` registra usuario y también devuelve `access_token`.
- `POST /auth/change-password` cambia la contraseña del usuario autenticado.
- `POST /auth/forgot-password` solicita un enlace de recuperacion sin revelar si el email existe.
- `POST /auth/reset-password` consume un token de un solo uso que vence en 30 minutos.
- Rutas protegidas (`/auth/me`, `/profiles/me`, `/users*`) requieren `Authorization: Bearer <token>`.

## Autorizar Swagger con el access token

### Panel exclusivo de superadmin

El backoffice ofrece `/admin` (Usuarios y accesos). Solo `superadmin` puede
listar cuentas con email, filtrar roles y estados, asignar o quitar `admin`
y activar o desactivar cuentas. El rol `manager` existente se conserva.
Un superadmin tambien tiene los permisos operativos de un administrador.

Para asignar el primer superadmin, registra primero una cuenta activa y ejecuta
desde la raiz del repositorio:

```bash
docker compose exec backend python promote_superadmin.py tu-email@ejemplo.com
docker compose restart backend
```

Sin Docker: desde este servicio y con su entorno configurado, ejecuta
`python promote_superadmin.py tu-email@ejemplo.com`. El comando no crea cuentas,
no cambia contrasenas y rechaza cuentas inactivas. Reinicia la API para renovar
las consultas en cache de TinyDB y luego vuelve a iniciar sesion.
No se promovio ninguna cuenta automaticamente.

Endpoints exclusivos:

- `GET /admin/users`: filtros `search` (email), `role`, `is_active`, `offset`, `limit`.
- `PATCH /admin/users/{id}`: acepta solo `role` (`user`, `manager`, `admin`)
  e `is_active`. No permite crear, eliminar ni asignar `superadmin`.
- `GET /admin/login-history`: filtros `search` (email), `succeeded`, `offset`, `limit`.

Los listados usan paginas de 25 por defecto, con un maximo de 100 registros.
Las cuentas superadmin no pueden ser eliminadas, desactivadas ni perder el rol
desde la API; su asignacion queda reservada al servidor para evitar bloqueos.
Tambien se exige superadmin para cambiar roles o estados con `PUT /users/{id}`:
ni un usuario ni un administrador pueden usar esa ruta para evadir el panel.
La desactivacion bloquea nuevos accesos y el uso de tokens existentes mientras
la cuenta siga inactiva.

El historial registra accesos exitosos y fallidos de `POST /auth/login` y
`POST /auth/token` (Swagger), desde su habilitacion: email ingresado (hasta 320
caracteres), identificador de cuenta si existe, resultado, origen y fecha UTC.
Se guarda en la tabla SQL `loginattempt` de `DATABASE_URL`, creada al iniciar la
API. No registra contrasenas, tokens ni conexiones en vivo; las solicitudes
rechazadas por validacion antes de autenticarse no generan un intento.
Si no puede persistir el intento, el login devuelve `503` en vez de conceder
un acceso sin registro. Protege las copias de seguridad: contienen datos de
cuentas e historial.

### Uso del token

1. Ejecuta `POST /auth/login` con el email y la contraseña.
2. Copia solamente el valor de `access_token` de la respuesta.
3. Pulsa **Authorize** en la parte superior de Swagger.
4. Pega el token en el campo `HTTPBearer` y confirma con **Authorize**.
5. Ejecuta una ruta protegida, por ejemplo `GET /auth/me`.

No escribas `Bearer` delante del token en el cuadro de Swagger. La interfaz lo
agrega automaticamente y envia esta cabecera:

```http
Authorization: Bearer <access_token>
```

## Configuracion

Las variables disponibles en `.env` son:

| Variable               | Uso                                     | Requerida  |
| ---------------------- | --------------------------------------- | ---------- |
| `DATABASE_URL`         | Base SQL (SQLite local por defecto)     | Si         |
| `JWT_SECRET`           | Firma los tokens; cambia el valor local | Produccion |
| `JWT_ALGORITHM`        | Algoritmo JWT, normalmente `HS256`      | Si         |
| `ACCESS_TOKEN_MINUTES` | Duracion de la sesion                   | Si         |
| `FRONTEND_URL`         | URL incluida en enlaces de recuperacion | Para email |
| `RESEND_API_KEY`       | Credencial de Resend                    | Para email |
| `EMAIL_FROM`           | Remitente verificado en Resend          | Para email |

`FRONTEND_URL` debe apuntar al backoffice accesible desde el navegador
(por defecto `http://localhost:3001`). En Codespaces, el Compose de desarrollo
pasa los datos del espacio al backend para convertir una URL local con puerto
en su URL HTTPS reenviada. Una URL publica configurada explicitamente se conserva.
Tras cambiar el entorno, recrea el backend y solicita un nuevo correo:
los enlaces ya enviados no cambian.

## Payloads

Login:

```json
{
  "email": "user@example.com",
  "password": "12345678"
}
```

Respuesta (`/auth/login` y `POST /users`):

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

## Ejemplo de integración frontend (React)

```tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("access_token");
    if (stored) setToken(stored);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error("Credenciales inválidas");

    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    setToken(data.access_token);
    navigate("/");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
    navigate("/login");
  };

  const authFetch = async (url: string, init: RequestInit = {}) => {
    const currentToken = localStorage.getItem("access_token");

    const headers = {
      ...(init.headers || {}),
      Authorization: `Bearer ${currentToken}`,
    };

    const response = await fetch(url, { ...init, headers });

    if (response.status === 401) {
      logout();
      throw new Error("Sesión expirada");
    }

    return response;
  };

  const value = useMemo(() => ({ token, login, logout, authFetch }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

Guard de rutas protegidas (`children` pattern):

```tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  if (!token) return null;
  return <>{children}</>;
}
```
