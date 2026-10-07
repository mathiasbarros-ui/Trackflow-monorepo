# Auditoría de manejo de errores

## Resumen
Se revisó el backend FastAPI, el frontend Next.js y los scripts auxiliares con foco en gestión de errores, exposición de información sensible, estados de carga y fallos silenciosos.

## Hallazgos priorizados

### CRÍTICO

1. Proxy frontend sin fallback ante fallo del backend
   - Archivo: uis/backoffice/src/app/backend/[...path]/route.ts
   - Problema: la llamada a fetch(target, requestInit) no estaba protegida por try/catch. Si el backend no responde, la ruta Next.js puede fallar sin devolver una respuesta útil al usuario.
   - Solución: envolver la llamada en try/catch y devolver una respuesta HTTP 502 con un mensaje genérico y seguro.

2. Envío de emails con gestión de error demasiado amplia y rastro excesivo
   - Archivo: services/trackflow-api/app/auth/email_service.py
   - Problema: el servicio de email podía fallar con una excepción genérica y no se controlaba de forma explícita. Además, el logging imprudente podía filtrar detalles internos.
   - Solución: capturar la excepción del servicio externo, elevar un error controlado y registrar un warning con contexto genérico.

### ALTO

3. Fallos silenciosos en la hidratación de sesión
   - Archivo: uis/backoffice/src/hooks/useAuth.tsx
   - Problema: la llamada a /auth/me en useEffect capturaba el error y borraba el token sin ofrecer estado visible ni reintento.
   - Solución: dejar una respuesta clara para el usuario y conservar un flujo de error legible, con mensaje de conexión o sesión expirada.

4. Error mostrado sin acción de recuperación
   - Archivo: uis/backoffice/src/app/incidents/page.tsx
   - Problema: los errores de carga/creación/actualización se exponían al usuario pero no había botón de reintento ni recuperación de estado.
   - Solución: mantener un bloque de error con acción Reintentar y evitar mostrar detalles crudos del backend.

5. Estado de carga/errores sin fallback útil para proveedores
   - Archivo: uis/backoffice/src/app/suppliers/page.tsx
   - Problema: si la carga falla, la tabla queda en un estado ambiguo y no hay un camino claro para reintentar.
   - Solución: mostrar un estado de error con botón de recarga y un mensaje comprensible.

### MEDIO

6. Recuperación de contraseña con fallos limitados a texto plano
   - Archivo: uis/backoffice/src/app/forgot-password/page.tsx
   - Problema: el flujo mostraba un error bruto sin ofrecer reintento ni alternativa de soporte.
   - Solución: agregar reintento y estado más claro para el usuario.

7. Respuesta de error del backend expuesta sin normalización
   - Archivo: uis/backoffice/src/app/reset-password/page.tsx
   - Problema: el detalle técnico del backend se reutilizaba sin filtrar.
   - Solución: mapear el detalle a un mensaje seguro y negocio.

8. Perfil con carga parcial y sin fallback de error
   - Archivo: uis/backoffice/src/app/account/profile/page.tsx
   - Problema: si la petición falla, se deja el formulario sin un estado de recuperación claro.
   - Solución: mostrar error con botón de reintento o una vista de carga/empty state.

## Cambios aplicados

Se corrigió el enfoque de manejo de errores en los puntos más críticos:

- Se añadió try/catch al proxy Next.js para devolver un 502 seguro.
- Se añadió manejo de errores de red en authFetch para evitar fallos silenciosos.
- Se controló la excepción del servicio externo de email con un RuntimeError y se redujo la salida de logs.
- Se reemplazó el log de detalle crudo por una alerta de nivel warning con contexto seguro.

## Recomendación final
Mantener una política uniforme:

- try/catch solo alrededor de la operación peligrosa concreta
- no loggear detalles sensibles
- devolver mensajes de usuario seguros y accionables
- incluir estados de error y reintento en UI
- usar HTTP 502/503 para fallos de dependencia externa
