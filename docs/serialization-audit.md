# Auditoría de serialización FastAPI

## Línea base original (antes de cambios)

Este bloque conserva el diagnóstico obtenido antes de modificar handlers o esquemas. Los datos de salida señalados como inferidos provienen de la construcción visible en el código; no se ejecutaron aún porque el entorno del workspace no tiene instalados todos los paquetes del backend.

### A. Resumen ejecutivo

- Backend: `services/trackflow-api/main.py`; una aplicación FastAPI y routers de auth, usuarios, perfiles, incidencias, proveedores e inventario.
- Versiones instaladas detectadas: FastAPI 0.141.1 y Pydantic 2.13.5. Pydantic v2.
- Inventario estático: 33 combinaciones método + ruta de negocio.
- Estado inicial: 15 ya serializadas, 0 parcialmente serializadas, 16 sin serializar y 2 excepciones técnicas no JSON.
- Las 15 serializadas son 5 de incidencias, 5 de proveedores y 5 de inventario. Las excepciones son `DELETE /suppliers/{supplier_id}` (204 sin cuerpo) y `GET /api/incidents/results/export` (descarga CSV).
- No se pudieron contrastar todavía las rutas con `app.routes`/`app.openapi()`: al importar `main`, el entorno virtual falla por falta de `sqlmodel`. Tampoco hay `pytest` en ese entorno. Por ello, los campos descritos abajo son inferidos estáticamente y no observados mediante ejecución.
- Se excluyen de las 33 rutas las rutas automáticas `/docs`, `/redoc` y `/openapi.json`. No se encontraron WebSockets, respuestas streaming ni subaplicaciones montadas en el código inspeccionado.
- `POST /api/incidents/analyze` se encontró registrado en código, pero el import opcional `packages.incidents_analysis` no existe en este checkout; el handler responde 501 cuando no está disponible. Su payload exitoso no puede determinarse sin inventar el contrato.

### B. Inventario original

| Método | Ruta                                  | Archivo / handler                                    | Propósito                          | Estado inicial    | `response_model` inicial  | Problema identificado                                                             | Esquema final                              | Estado final                      |
| ------ | ------------------------------------- | ---------------------------------------------------- | ---------------------------------- | ----------------- | ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------- | --------- |
| GET    | `/`                                   | `main.py` / `home`                                   | Estado de servicio                 | ❌                | Ninguno                   | JSON literal sin contrato                                                         | Pendiente de implementar                   | Pendiente                         |
| POST   | `/api/incidents/analyze`              | `main.py` / `analyze_incidents`                      | Analizar CSV                       | ❌                | Ninguno                   | Payload de éxito depende de módulo ausente                                        | Pendiente de determinar                    | Pendiente por bloqueo             |
| GET    | `/api/incidents/results/export`       | `main.py` / `export_results`                         | Descargar resultados CSV           | Excepción técnica | Ninguno                   | CSV, no JSON                                                                      | No aplica                                  | Excepción técnica                 |
| POST   | `/auth/token`                         | `app/auth/routes.py` / `login_token`                 | Emitir token OAuth2                | ❌                | Ninguno                   | JSON de token sin contrato                                                        | Pendiente de implementar                   | Pendiente                         |
| POST   | `/auth/change-password`               | `app/auth/routes.py` / `change_password`             | Cambiar contraseña autenticada     | ❌                | Ninguno                   | Respuesta de mensaje sin contrato                                                 | Pendiente de implementar                   | Pendiente                         |
| POST   | `/auth/forgot-password`               | `app/auth/routes.py` / `forgot_password`             | Solicitar recuperación             | ❌                | Ninguno                   | Mensaje genérico sin contrato; protege existencia de cuenta                       | Pendiente de implementar                   | Pendiente                         |
| POST   | `/auth/reset-password`                | `app/auth/routes.py` / `reset_password`              | Restablecer contraseña             | ❌                | Ninguno                   | Respuesta de mensaje sin contrato                                                 | Pendiente de implementar                   | Pendiente                         |
| POST   | `/auth/login`                         | `app/auth/routes.py` / `login`                       | Iniciar sesión                     | ❌                | Ninguno                   | Token, usuario y perfil sin proyección tipada                                     | Pendiente de implementar                   | Pendiente                         |
| GET    | `/auth/me`                            | `app/auth/routes.py` / `get_me`                      | Consultar usuario autenticado      | ❌                | Ninguno                   | Usuario y perfil sin contrato                                                     | Pendiente de implementar                   | Pendiente                         |
| POST   | `/users`                              | `app/auth/users.py` / `register`                     | Registrar usuario                  | ❌                | Ninguno                   | Token, usuario y perfil sin contrato                                              | Pendiente de implementar                   | Pendiente                         |
| GET    | `/users`                              | `app/auth/users.py` / `list_users`                   | Listar usuarios                    | ❌                | Ninguno                   | Proyección de usuarios sin contrato; incluye email de terceros                    | Pendiente de implementar                   | Pendiente                         |
| GET    | `/users/{user_id}`                    | `app/auth/users.py` / `get_user`                     | Consultar usuario propio/admin     | ❌                | Ninguno                   | Proyección pública sin contrato                                                   | Pendiente de implementar                   | Pendiente                         |
| PUT    | `/users/{user_id}`                    | `app/auth/users.py` / `edit_user`                    | Actualizar usuario                 | ❌                | Ninguno                   | Proyección pública sin contrato                                                   | Pendiente de implementar                   | Pendiente                         |
| DELETE | `/users/{user_id}`                    | `app/auth/users.py` / `remove_user`                  | Eliminar usuario                   | ❌                | Ninguno                   | Mensaje JSON sin contrato                                                         | Pendiente de implementar                   | Pendiente                         |
| GET    | `/profiles/me`                        | `app/auth/profiles.py` / `get_my_profile`            | Consultar perfil propio            | ❌                | Ninguno                   | Diccionario de perfil sin contrato                                                | Pendiente de implementar                   | Pendiente                         |
| PUT    | `/profiles/me`                        | `app/auth/profiles.py` / `edit_my_profile`           | Actualizar perfil propio           | ❌                | Ninguno                   | Diccionario de perfil sin contrato                                                | Pendiente de implementar                   | Pendiente                         |
| POST   | `/api/incidents`                      | `app/incidents/routes.py` / `create_incident`        | Crear incidencia                   | ✅                | `IncidentResponse`        | Contrato explícito; incluye IDs internos no usados por UI                         | Revisar proyección                         | Pendiente                         |
| GET    | `/api/incidents`                      | `app/incidents/routes.py` / `list_incidents`         | Listar/filtrar incidencias         | ✅                | `list[IncidentResponse]`  | Contrato explícito; incluye IDs internos no usados por UI                         | Revisar proyección                         | Pendiente                         |
| GET    | `/api/incidents/summary`              | `app/incidents/routes.py` / `incidents_summary`      | Resumen agregado                   | ✅                | `IncidentSummaryResponse` | Contrato explícito                                                                | Sin cambio previsto                        | Pendiente                         |
| GET    | `/api/incidents/{incident_id}`        | `app/incidents/routes.py` / `get_incident`           | Consultar incidencia               | ✅                | `IncidentResponse`        | Contrato explícito; incluye IDs internos no usados por UI                         | Revisar proyección                         | Pendiente                         |
| PATCH  | `/api/incidents/{incident_id}/status` | `app/incidents/routes.py` / `update_incident_status` | Cambiar estado de incidencia       | ✅                | `IncidentResponse`        | Contrato explícito; incluye IDs internos no usados por UI                         | Revisar proyección                         | Pendiente                         |
| POST   | `/suppliers`                          | `app/suppliers/routes.py` / `create_supplier`        | Crear proveedor                    | ✅                | `SupplierResponse`        | Contrato explícito                                                                | Sin cambio previsto                        | Pendiente                         |
| GET    | `/suppliers`                          | `app/suppliers/routes.py` / `list_suppliers`         | Listar/filtrar proveedores         | ✅                | `list[SupplierResponse]`  | Contrato explícito                                                                | Sin cambio previsto                        | Pendiente                         |
| GET    | `/suppliers/{supplier_id}`            | `app/suppliers/routes.py` / `get_supplier`           | Consultar proveedor                | ✅                | `SupplierResponse`        | Contrato explícito                                                                | Sin cambio previsto                        | Pendiente                         |
| PATCH  | `/suppliers/{supplier_id}/rate`       | `app/suppliers/routes.py` / `update_supplier_rate`   | Actualizar tarifa                  | ✅                | `SupplierResponse`        | Contrato explícito                                                                | Sin cambio previsto                        | Pendiente                         |
| PATCH  | `/suppliers/{supplier_id}/status`     | `app/suppliers/routes.py` / `update_supplier_status` | Actualizar estado                  | ✅                | `SupplierResponse`        | Contrato explícito                                                                | Sin cambio previsto                        | Pendiente                         |
| DELETE | `/suppliers/{supplier_id}`            | `app/suppliers/routes.py` / `delete_supplier`        | Eliminar proveedor                 | Excepción técnica | Ninguno; status 204       | Respuesta correctamente vacía                                                     | No aplica                                  | Excepción técnica                 |
| GET    | `/inventory/products`                 | `routers/inventory.py` / `get_products`              | Listar productos y stock calculado | ✅                | `list[SKUResponse]`       | Contrato explícito                                                                | Sin cambio previsto                        | Pendiente                         |
| POST   | `/inventory/products`                 | `routers/inventory.py` / `create_product`            | Crear producto                     | ✅                | `SKUResponse`             | Contrato explícito                                                                | Sin cambio previsto                        | Pendiente                         |
| GET    | `/inventory/products/{product_id}`    | `routers/inventory.py` / `get_product`               | Consultar producto y stock         | ✅                | `SKUResponse`             | Contrato explícito                                                                | Sin cambio previsto                        | Pendiente                         |
| POST   | `/inventory/orders/inbound`           | `routers/inventory.py` / `create_inbound_order`      | Registrar entrada                  | ✅                | `StockEntryResponse`      | Contrato explícito                                                                | Sin cambio previsto                        | Pendiente                         |
| POST   | `/inventory/orders/outbound`          | `routers/inventory.py` / `create_outbound_order`     | Registrar salida                   | ✅                | `StockExitResponse`       | Contrato explícito                                                                | Contrato de entrada heredado por respuesta | Revisar separación entrada/salida | Pendiente |
| GET    | `/inventory/orders`                   | `routers/inventory.py` / `get_orders`                | Historial de movimientos           | ❌                | Ninguno                   | Lista de diccionarios; `OrderResponse` existente no coincide (`product` vs `sku`) | Pendiente de implementar                   | Pendiente                         |

### C. Fichas por endpoint

Las fichas detalladas se completarán después de cerrar el inventario final. La ausencia de evidencia de ejecución se mantiene explícita: el backend todavía no pudo importarse en este entorno.

### D. Seguridad y compatibilidad (hallazgos iniciales)

- Las funciones de auth obtienen usuarios con `hashed_password`, pero los endpoints inspeccionados construyen respuestas explícitas sin incluir ese campo. Se verificará con modelos y tests de respuesta.
- `GET /users` devuelve actualmente emails de todas las cuentas a cualquier usuario autenticado; no se encontró consumidor del listado en `uis/`. Se evaluará una proyección mínima que preserve identificadores y campos de gestión, pero omita email de terceros.
- Login y `/auth/me` incluyen email, necesario para `CurrentUser` y para la pantalla de cuenta (`uis/backoffice/src/hooks/useAuth.tsx` y `uis/backoffice/src/app/account/profile/page.tsx`).
- El historial de inventario muestra `user_uuid` y usa nombre, SKU, almacén, tipo, cantidad y fecha (`uis/backoffice/src/app/backoffice/inventory/orders/page.tsx`). El anidado actual contiene más campos de producto que los leídos por esa vista.
- El tipo `Incident` de `uis/backoffice/src/app/incidents/page.tsx` declara ID, título, descripción, categoría, estado, origen, sucursal, `reported_by_user_id`, `legacy_id`, `created_at` y `updated_at`. Aunque la vista no renderiza los dos IDs, se conservan por compatibilidad con el contrato tipado.
- La UI de proveedores usa ID, nombre, país, categoría, tarifa y estado (`uis/backoffice/src/app/suppliers/page.tsx`).
- Recuperación de contraseña mantiene un mensaje genérico para cuentas existentes e inexistentes. No se cambiará esa semántica.

## Auditoría final

### A. Resumen ejecutivo

- Backend auditado: `services/trackflow-api/main.py`, una aplicación FastAPI con routers de auth, usuarios, perfiles, incidencias, proveedores e inventario.
- Versiones ejecutadas: FastAPI 0.141.1, Pydantic 2.13.5, SQLModel 0.0.48.
- Total: 33 operaciones HTTP (método + ruta). Diagnóstico inicial: 15 ✅, 0 ⚠️, 16 ❌, 2 excepciones no JSON. Resultado: 30 respuestas JSON con esquema explícito y reflejadas en OpenAPI; 15 contratos que faltaban fueron agregados; 1 ruta JSON queda pendiente por bloqueo; 2 excepciones técnicas justificadas.
- La suma inicial considera como ✅ las rutas que ya tenían un `response_model` apropiado y compatible con los tipos consumidores. Las 16 ❌ incluyen 15 contratos que se implementaron y el analizador, cuyo módulo de éxito no está en este checkout.
- Se incluyen todas las rutas HTTP de negocio registradas por los routers y por `main.py`. Se excluyen `/docs`, `/redoc` y `/openapi.json`. No hay WebSockets ni subaplicaciones montadas. `DELETE /suppliers/{supplier_id}` conserva 204 vacío y la descarga CSV se documenta como `text/csv`, sin modelo Pydantic.
- Verificación de registro: `app.openapi()` contiene 33 operaciones en 25 paths. FastAPI 0.141.1 muestra directamente solo 3 objetos `APIRoute` en `app.routes`; los routers incluidos se representan internamente como routers diferidos, pero sí se resuelven en OpenAPI. No se omitió ninguna operación.
- Estado final: 30 esquemas JSON explícitos confirmados en OpenAPI; `POST /api/incidents/analyze` sigue con esquema JSON vacío y pendiente de definir; `GET /api/incidents/results/export` y `DELETE /suppliers/{supplier_id}` son excepciones no JSON documentadas.

### B. Inventario final

| Método | Ruta | Archivo / handler | Propósito | Estado inicial | `response_model` inicial | Problema identificado | Esquema final | Estado final |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/` | `main.py` / `home` | Estado del servicio | ❌ | Ninguno | JSON sin contrato | `HomeResponse` | Validado |
| POST | `/api/incidents/analyze` | `main.py` / `analyze_incidents` | Analizar CSV | ❌ | Ninguno | No está el módulo que define el payload de éxito | Pendiente; no inventado | Pendiente por bloqueo |
| GET | `/api/incidents/results/export` | `main.py` / `export_results` | Descargar CSV | Excepción técnica | Ninguno | OpenAPI lo describía como JSON | `Response`, `text/csv` | Excepción técnica documentada |
| POST | `/auth/token` | `app/auth/routes.py` / `login_token` | Emitir token OAuth2 | ❌ | Ninguno | Token sin contrato | `AccessTokenResponse` | Validado |
| POST | `/auth/change-password` | `app/auth/routes.py` / `change_password` | Cambiar contraseña | ❌ | Ninguno | Mensaje sin contrato | `MessageResponse` | Validado |
| POST | `/auth/forgot-password` | `app/auth/routes.py` / `forgot_password` | Solicitar recuperación | ❌ | Ninguno | Mensaje genérico sin contrato | `MessageResponse` | Validado |
| POST | `/auth/reset-password` | `app/auth/routes.py` / `reset_password` | Restablecer contraseña | ❌ | Ninguno | Mensaje sin contrato | `MessageResponse` | Validado |
| POST | `/auth/login` | `app/auth/routes.py` / `login` | Iniciar sesión | ❌ | Ninguno | Token, usuario y perfil sin proyección | `LoginResponse` | Validado |
| GET | `/auth/me` | `app/auth/routes.py` / `get_me` | Usuario autenticado | ❌ | Ninguno | Usuario y perfil sin proyección | `CurrentUserResponse` | Validado |
| POST | `/users` | `app/auth/users.py` / `register` | Registrar cuenta | ❌ | Ninguno | Token, usuario y perfil sin proyección | `RegistrationResponse` | Validado |
| GET | `/users` | `app/auth/users.py` / `list_users` | Listar cuentas | ❌ | Ninguno | Devolvía emails de terceros; sin modelo | `list[UserListResponse]` | Validado |
| GET | `/users/{user_id}` | `app/auth/users.py` / `get_user` | Consultar propia/admin | ❌ | Ninguno | Proyección pública sin modelo | `UserResponse` | Validado |
| PUT | `/users/{user_id}` | `app/auth/users.py` / `edit_user` | Actualizar usuario | ❌ | Ninguno | Proyección pública sin modelo | `UserResponse` | Validado |
| DELETE | `/users/{user_id}` | `app/auth/users.py` / `remove_user` | Eliminar usuario | ❌ | Ninguno | Mensaje sin modelo | `MessageResponse` | Validado |
| GET | `/profiles/me` | `app/auth/profiles.py` / `get_my_profile` | Consultar perfil propio | ❌ | Ninguno | Diccionario sin modelo | `ProfileResponse` | Validado |
| PUT | `/profiles/me` | `app/auth/profiles.py` / `edit_my_profile` | Actualizar perfil propio | ❌ | Ninguno | Diccionario/posible `null` sin modelo | `ProfileResponse \| None` | Validado |
| POST | `/api/incidents` | `app/incidents/routes.py` / `create_incident` | Crear incidencia | ✅ | `IncidentResponse` | Sin defecto; contrato conservado | `IncidentResponse` | Validado |
| GET | `/api/incidents` | `app/incidents/routes.py` / `list_incidents` | Listar y filtrar | ✅ | `list[IncidentResponse]` | Sin defecto; contrato conservado | `list[IncidentResponse]` | Validado |
| GET | `/api/incidents/summary` | `app/incidents/routes.py` / `incidents_summary` | Resumen agregado | ✅ | `IncidentSummaryResponse` | Sin defecto | `IncidentSummaryResponse` | Validado |
| GET | `/api/incidents/{incident_id}` | `app/incidents/routes.py` / `get_incident` | Consultar incidencia | ✅ | `IncidentResponse` | Sin defecto; conserva IDs del tipo UI | `IncidentResponse` | Validado |
| PATCH | `/api/incidents/{incident_id}/status` | `app/incidents/routes.py` / `update_incident_status` | Cambiar estado | ✅ | `IncidentResponse` | Sin defecto; contrato conservado | `IncidentResponse` | Validado |
| POST | `/suppliers` | `app/suppliers/routes.py` / `create_supplier` | Crear proveedor | ✅ | `SupplierResponse` | Sin defecto | `SupplierResponse` | Validado |
| GET | `/suppliers` | `app/suppliers/routes.py` / `list_suppliers` | Listar y filtrar | ✅ | `list[SupplierResponse]` | Sin defecto | `list[SupplierResponse]` | Validado |
| GET | `/suppliers/{supplier_id}` | `app/suppliers/routes.py` / `get_supplier` | Consultar proveedor | ✅ | `SupplierResponse` | Sin defecto | `SupplierResponse` | Validado |
| PATCH | `/suppliers/{supplier_id}/rate` | `app/suppliers/routes.py` / `update_supplier_rate` | Actualizar tarifa | ✅ | `SupplierResponse` | Sin defecto | `SupplierResponse` | Validado |
| PATCH | `/suppliers/{supplier_id}/status` | `app/suppliers/routes.py` / `update_supplier_status` | Actualizar estado | ✅ | `SupplierResponse` | Sin defecto | `SupplierResponse` | Validado |
| DELETE | `/suppliers/{supplier_id}` | `app/suppliers/routes.py` / `delete_supplier` | Eliminar proveedor | Excepción técnica | Sin cuerpo, 204 | Correctamente sin JSON | Sin modelo | Excepción técnica |
| GET | `/inventory/products` | `routers/inventory.py` / `get_products` | Listar productos y stock | ✅ | `list[SKUResponse]` | Contrato conservado | `list[SKUResponse]` | Validado |
| POST | `/inventory/products` | `routers/inventory.py` / `create_product` | Crear producto | ✅ | `SKUResponse` | Contrato conservado | `SKUResponse` | Validado |
| GET | `/inventory/products/{product_id}` | `routers/inventory.py` / `get_product` | Consultar producto y stock | ✅ | `SKUResponse` | Contrato conservado | `SKUResponse` | Validado |
| POST | `/inventory/orders/inbound` | `routers/inventory.py` / `create_inbound_order` | Registrar entrada | ✅ | `StockEntryResponse` | Contrato de salida separado de entrada | `StockEntryResponse` | Validado |
| POST | `/inventory/orders/outbound` | `routers/inventory.py` / `create_outbound_order` | Registrar salida | ✅ | `StockExitResponse` | Contrato de salida separado de entrada | `StockExitResponse` | Validado |
| GET | `/inventory/orders` | `routers/inventory.py` / `get_orders` | Historial de movimientos | ❌ | Ninguno | Lista dinámica; esquema existente usaba `product` y la respuesta real `sku` | `list[OrderResponse]` | Validado |

### C. Fichas individuales

Todos los campos de salida original sin indicación de ejecución son inferidos estáticamente de los retornos y modelos. Los handlers de éxito ejecutados se identifican expresamente; las excepciones HTTP se mantienen fuera de la serialización de éxito.

#### `GET /`

- Handler: `services/trackflow-api/main.py`, `home`; propósito: comprobar servicio. Entrada: ninguna. Consumidor localizado: ninguno en `uis/`.
- Original: inferido `{message: str}`, sin modelo; éxito 200; estado inicial ❌.
- Final: `HomeResponse {message: str}`. Cambio en `main.py`; probado por TestClient (200) y esquema OpenAPI. No contiene datos privados.

#### `POST /api/incidents/analyze`

- Handler: `services/trackflow-api/main.py`, `analyze_incidents`; propósito: analizar archivo CSV. Entrada: multipart `file: UploadFile`. Consumidor localizado: ninguno en `uis/`.
- Original: respuesta exitosa inferible solo como valor de `analyze_csv_text`; los campos no son inspeccionables. Sin modelo; éxito previsto 200; estado inicial ❌. El import `packages.incidents_analysis` no está en el checkout y la ruta responde 501 si falta.
- Final: pendiente; no se inventó esquema. OpenAPI muestra `application/json` con schema vacío. No se pudo probar éxito; documentado como bloqueo.

#### `GET /api/incidents/results/export`

- Handler: `main.py`, `export_results`; propósito: descargar CSV generado a partir del último análisis. Entrada: ninguna. Consumidor localizado: ninguno en `uis/`.
- Original: `Response` de `summary_to_csv`, `Content-Disposition: attachment; filename="results.csv"`; sin modelo; éxito 200; excepción técnica no JSON.
- Final: `Response`, clase `Response`, `text/csv` (`string`, formato `binary`) documentado en OpenAPI. Se corrigió el media type erróneo generado como JSON. TestClient verificó 200, contenido y `Content-Type`; la integración real del módulo analizador sigue pendiente.

#### `POST /auth/token`

- Handler: `app/auth/routes.py`, `login_token`; propósito: emitir token OAuth2. Entrada: formulario `username` (email) y `password`. Consumidor localizado: OAuth2 de Swagger.
- Original inferido: `{access_token: str, token_type: str}`; sin modelo; éxito 200; estado ❌.
- Final: `AccessTokenResponse {access_token: str, token_type: str}`. Cambio en `app/auth/schemas.py` y decorador; TestClient 200 y validación Pydantic ejecutados. El token emitido es contractual; no se expone hash.

#### `POST /auth/change-password`

- Handler: `app/auth/routes.py`, `change_password`; propósito: cambiar contraseña autenticada. Entrada: `ChangePasswordInput {current_password: str, new_password: str}` (8–72 caracteres) y bearer. Consumidor: `uis/backoffice/src/app/account/change-password/page.tsx`.
- Original inferido: `{message: str}`; sin modelo; éxito 200; estado ❌.
- Final: `MessageResponse {message: str}`; decorador y modelo en auth. Los errores 400/401 y la escritura del hash permanecen sin cambio. Validado por suite pytest.

#### `POST /auth/forgot-password`

- Handler: `app/auth/routes.py`, `forgot_password`; propósito: iniciar recuperación. Entrada: `ForgotPasswordInput {email: str}`. Consumidor: `uis/backoffice/src/app/forgot-password/page.tsx`.
- Original inferido: `{message: str}` idéntico para usuario existente o inexistente; sin modelo; éxito 200; estado ❌.
- Final: `MessageResponse {message: str}`. Se preservó el texto genérico para no revelar existencia de cuentas; modelo/decorador en auth. Casos existente e inexistente cubiertos por pytest.

#### `POST /auth/reset-password`

- Handler: `app/auth/routes.py`, `reset_password`; propósito: restablecer contraseña. Entrada: `ResetPasswordInput {token: str, new_password: str}` (8–72 caracteres). Consumidor: `uis/backoffice/src/app/reset-password/page.tsx`.
- Original inferido: `{message: str}`; sin modelo; éxito 200; estado ❌.
- Final: `MessageResponse {message: str}`. El token se usa internamente y no se devuelve; decorador/modelo explícito. Camino exitoso, token inválido y validación de contraseña cubiertos por pytest.

#### `POST /auth/login`

- Handler: `app/auth/routes.py`, `login`; propósito: autenticar. Entrada: `LoginInput {email: str, password: str}`. Consumidor: `uis/backoffice/src/hooks/useAuth.tsx`.
- Original inferido: token, `user {id,email,role}` y perfil TinyDB; sin modelo; éxito 200; estado ❌.
- Final: `LoginResponse {access_token: str, token_type: str, user: LoginUserResponse{id,email,role}, profile: ProfileResponse | None}`; perfil permite `id`, `user_id`, `name`, `phone`, `address` opcionales/nulos. Se usa `response_model_exclude_unset` para preservar perfiles parciales. TestClient verificó 200 y el contrato; test de seguridad inyecta un usuario con `hashed_password` y confirma que no sale.

#### `GET /auth/me`

- Handler: `app/auth/routes.py`, `get_me`; propósito: devolver cuenta autenticada. Entrada: bearer. Consumidores: `useAuth.tsx` y `uis/backoffice/src/app/account/profile/page.tsx` necesitan ID, email, rol y perfil.
- Original inferido: `{id,email,role,profile}`; sin modelo; éxito 200; estado ❌.
- Final: `CurrentUserResponse {id,email,role,profile: ProfileResponse | None}` con proyección sparse. Cambio en auth schemas/decorador; TestClient y suite verifican 200, perfil nulo/parcial y ausencia del hash.

#### `POST /users`

- Handler: `app/auth/users.py`, `register`; propósito: alta de cuenta. Entrada: `UserCreate {email,password,name?,phone?,address?}`. Consumidor: `useAuth.tsx` registra y luego inicia sesión; no lee el JSON de registro.
- Original inferido: token, `public_user {id,email,is_active,role,created_at}` y perfil `{id,user_id,name,phone,address}`; sin modelo; éxito 200; estado ❌.
- Final: `RegistrationResponse {access_token,token_type,user: {id,is_active,role,created_at},profile: ProfileResponse}`. Se omite email del usuario de registro por no ser consumido y se excluyen hash/credenciales. Modelo en auth; TestClient/pytest comprueban token y ausencia de hash/email en la proyección del usuario.

#### `GET /users`

- Handler: `app/auth/users.py`, `list_users`; propósito: listar cuentas autenticado. Entrada: bearer. Consumidor localizado: ninguno en `uis/`.
- Original inferido: lista `{id,email,is_active,role,created_at}`; sin modelo; éxito 200; estado ❌. El email de terceros no era necesario para consumidores encontrados.
- Final: `list[UserListResponse] {id,is_active,role,created_at}`; se retiró el email de cada usuario y el esquema impide su reaparición accidental. Test existente compara exactamente la proyección y confirma que no expone correo.

#### `GET /users/{user_id}`

- Handler: `app/auth/users.py`, `get_user`; propósito: consultar usuario propio o admin. Entrada: `user_id` y bearer; autorización sin cambios. Consumidor frontend localizado: ninguno.
- Original inferido: `{id,email,is_active,role,created_at}`; sin modelo; éxito 200; estado ❌.
- Final: `UserResponse {id,email,is_active,role,created_at}`. Email corresponde a cuenta propia/admin bajo autorización existente; no se filtra `hashed_password`. Decorador y esquema explícitos; tests verifican éxito, permisos y usuario ausente.

#### `PUT /users/{user_id}`

- Handler: `app/auth/users.py`, `edit_user`; propósito: actualizar usuario propio o admin. Entrada `UserUpdate {email?,password?,role?,is_active?}`; `exclude_none`, hash de password y validación de rol conservados. Consumidor frontend localizado: ninguno.
- Original inferido: `{id,email,is_active,role,created_at}`; sin modelo; éxito 200; estado ❌.
- Final: `UserResponse {id,email,is_active,role,created_at}`; password/hash no son campos de salida. Decorador/modelo explícitos; tests existentes cubren edición, cuerpo vacío y autorización.

#### `DELETE /users/{user_id}`

- Handler: `app/auth/users.py`, `remove_user`; propósito: borrar usuario propio o admin. Entrada: `user_id` y bearer; consumidor frontend localizado: ninguno.
- Original inferido: `{message: "Usuario eliminado"}`; sin modelo; éxito 200; estado ❌.
- Final: `MessageResponse {message: str}`; no se cambió el código HTTP ni la eliminación de perfil. Tests existentes verifican eliminación y errores.

#### `GET /profiles/me`

- Handler: `app/auth/profiles.py`, `get_my_profile`; propósito: consultar datos de contacto propios. Entrada: bearer. Consumidor: página de cuenta lee nombre, teléfono y dirección; la estructura de perfil de `useAuth.tsx` acepta IDs opcionales.
- Original inferido del registro TinyDB: `{id?,user_id?,name?,phone?,address?}`; sin modelo; éxito 200 o 404; estado ❌.
- Final: `ProfileResponse {id?,user_id?,name?,phone?,address?}`; `response_model_exclude_unset=True` mantiene perfiles parciales sin añadir campos inexistentes. 404 preservado; pruebas de perfil.

#### `PUT /profiles/me`

- Handler: `app/auth/profiles.py`, `edit_my_profile`; propósito: actualizar contacto propio. Entrada: `ProfileUpdate {name?,phone?,address?}`, admite null como antes y mantiene `exclude_none`. Consumidor: página de cuenta.
- Original inferido: diccionario actualizado o `null` si no hay registro; sin modelo; éxito 200; estado ❌.
- Final: `ProfileResponse | None`, sparse. La nulabilidad preserva el resultado del servicio existente; prueba específica cubre `None`, además de cuerpo vacío y actualización.

#### `POST /api/incidents`

- Handler: `app/incidents/routes.py`, `create_incident`; propósito: crear incidencia. Entrada `IncidentCreateRequest {title,description,category,status,origin,branch}` y bearer. Consumidor: `uis/backoffice/src/app/incidents/page.tsx` declara todos los campos de `Incident`.
- Original inferido por `IncidentResponse`: `{id,title,description,category,status,origin,branch,reported_by_user_id,legacy_id,created_at,updated_at}`; `IncidentResponse`; éxito 201; estado ✅.
- Final sin cambio: `IncidentResponse` con esos once campos explícitos; conserva IDs porque el tipo frontend los declara. Prueba OpenAPI confirma respuesta 201 modelada; las reglas y errores permanecen intactos.

#### `GET /api/incidents`

- Handler: `app/incidents/routes.py`, `list_incidents`; propósito: filtrar incidencias. Entrada query `status`, `origin`, `branch`, `category` y bearer. Consumidor: página de incidencias renderiza contenido y estado; tipo también declara reporter/legacy IDs.
- Original inferido: lista de `IncidentResponse`; éxito 200; estado ✅.
- Final `list[IncidentResponse]`, mismo contrato y filtros. OpenAPI registra lista tipada; no se alteraron consultas ni paginación.

#### `GET /api/incidents/summary`

- Handler: `app/incidents/routes.py`, `incidents_summary`; propósito: recuentos agregados. Entrada: bearer. Consumidor: página de incidencias usa total y mapas por estado, categoría, origen y sucursal.
- Original inferido: `{total,by_status,by_category,by_origin,by_branch}`; `IncidentSummaryResponse`; éxito 200; estado ✅.
- Final sin cambio: `IncidentSummaryResponse {total:int, by_status/by_category/by_origin/by_branch: dict[str,int]}`. OpenAPI confirma esquema; mapas conservan claves dinámicas del dominio.

#### `GET /api/incidents/{incident_id}`

- Handler: `app/incidents/routes.py`, `get_incident`; propósito: consultar incidencia. Entrada: ID entero y bearer. Consumidor: tipo `Incident` del backoffice.
- Original inferido: los once campos de `IncidentResponse`; modelo ya explícito; éxito 200; estado ✅.
- Final `IncidentResponse`; sin cambio de contrato. Incluye IDs declarados por el consumidor y no expone secretos. OpenAPI confirma contrato; 404 preservado.

#### `PATCH /api/incidents/{incident_id}/status`

- Handler: `app/incidents/routes.py`, `update_incident_status`; propósito: transición de estado. Entrada: ID, `IncidentStatusUpdateRequest {status}` y bearer. Consumidor: página de incidencias.
- Original inferido: `IncidentResponse`; éxito 200; estado ✅.
- Final sin cambio: `IncidentResponse`; actualización, transición válida y errores 400 preservados. OpenAPI confirma esquema.

#### `POST /suppliers`

- Handler: `app/suppliers/routes.py`, `create_supplier`; propósito: crear proveedor. Entrada `SupplierCreateRequest {name,country,category,rate,status}`. Consumidor: `uis/backoffice/src/app/suppliers/page.tsx` usa los seis campos de salida.
- Original inferido: `{id,name,country,category,rate,status,updated_at}`; `SupplierResponse`; éxito 201; estado ✅.
- Final sin cambio: `SupplierResponse` con esos siete campos explícitos. OpenAPI confirma respuesta 201. No se modificó acceso ni reglas de negocio.

#### `GET /suppliers`

- Handler: `app/suppliers/routes.py`, `list_suppliers`; propósito: filtrar proveedores. Entrada query opcional `country`, `category`. Consumidor: página de proveedores usa `id,name,country,category,rate,status`.
- Original inferido: lista de `SupplierResponse`; éxito 200; estado ✅.
- Final `list[SupplierResponse]`; filtros y `updated_at` del contrato preservados. OpenAPI confirma esquema de lista.

#### `GET /suppliers/{supplier_id}`

- Handler: `app/suppliers/routes.py`, `get_supplier`; propósito: consultar proveedor. Entrada: ID entero; el consumidor frontend obtiene detalle indirectamente desde la lista y usa sus campos.
- Original inferido: `SupplierResponse`; éxito 200; estado ✅.
- Final `SupplierResponse {id,name,country,category,rate,status,updated_at}` sin cambio; OpenAPI confirma esquema y 404 continúa igual.

#### `PATCH /suppliers/{supplier_id}/rate`

- Handler: `app/suppliers/routes.py`, `update_supplier_rate`; propósito: cambiar tarifa. Entrada `SupplierRateUpdateRequest {rate: float > 0}` y supplier ID. Consumidor: página de proveedores envía tarifa y recarga lista.
- Original inferido: `SupplierResponse`; éxito 200; estado ✅.
- Final `SupplierResponse`; contrato y validación existentes conservados. OpenAPI confirma modelo.

#### `PATCH /suppliers/{supplier_id}/status`

- Handler: `app/suppliers/routes.py`, `update_supplier_status`; propósito: activar/suspender proveedor. Entrada `SupplierStatusUpdateRequest {status}` y supplier ID. Consumidor: página de proveedores.
- Original inferido: `SupplierResponse`; éxito 200; estado ✅.
- Final `SupplierResponse`; estados y autorización existentes sin cambios. OpenAPI confirma modelo.

#### `DELETE /suppliers/{supplier_id}`

- Handler: `app/suppliers/routes.py`, `delete_supplier`; propósito: eliminar proveedor. Entrada: ID entero. Consumidor frontend localizado: ninguno.
- Original: cuerpo vacío, status 204; excepción técnica, no respuesta JSON.
- Final: sigue sin response model; OpenAPI documenta 204 sin contenido. No se fabricó modelo. El handler no se ejecutó contra la base real; contrato validado estáticamente.

#### `GET /inventory/products`

- Handler: `routers/inventory.py`, `get_products`; propósito: listar SKU y stock calculado. Entrada: dependencia DB. Consumidor: páginas de productos/entrada/salida usan datos de `SKU` y `current_stock`.
- Original inferido: lista `SKUResponse`; éxito 200; estado ✅.
- Final `list[SKUResponse] {id:int,name:str,sku:str,client_name:str,category:str,warehouse:str,current_stock:int}`. Modelo explícito; modelo final desacoplado de `SKUCreate`; OpenAPI confirma.

#### `POST /inventory/products`

- Handler: `routers/inventory.py`, `create_product`; propósito: crear SKU. Entrada `SKUCreate {name,sku,client_name,category,warehouse}`, DB y bearer. Consumidor: cliente API de inventario.
- Original inferido: `SKUResponse`; éxito 200; estado ✅.
- Final `SKUResponse` con seis campos de producto más `id` y `current_stock`. Entrada/salida son modelos separados; status 200 conservado. OpenAPI confirma.

#### `GET /inventory/products/{product_id}`

- Handler: `routers/inventory.py`, `get_product`; propósito: SKU y stock de un producto. Entrada: ID y DB. Consumidor: páginas de inventario consultan `SKU`.
- Original inferido: `SKUResponse`; éxito 200; estado ✅.
- Final `SKUResponse`; campos explicitados y sin relaciones ORM. OpenAPI confirma; 404 se mantiene.

#### `POST /inventory/orders/inbound`

- Handler: `routers/inventory.py`, `create_inbound_order`; propósito: registrar entrada. Entrada `StockEntryCreate {sku_id,quantity,reference,warehouse}`, DB y bearer. Consumidor: `lib/inventory.ts` tipa el resultado como `StockEntryResponse`.
- Original inferido: `StockEntryResponse`; éxito 200; estado ✅.
- Final `StockEntryResponse {id,sku_id,quantity,reference,warehouse,created_at:datetime,user_uuid:str}` separado de la entrada y con `from_attributes=True`. OpenAPI confirma; respuesta mantiene campos TypeScript.

#### `POST /inventory/orders/outbound`

- Handler: `routers/inventory.py`, `create_outbound_order`; propósito: registrar salida. Entrada `StockExitCreate {sku_id,quantity,exit_type,tracking_number?,warehouse}`, DB y bearer. Consumidor: `lib/inventory.ts` y página de salida.
- Original inferido: `StockExitResponse`; éxito 200; estado ✅.
- Final `StockExitResponse {id,sku_id,quantity,exit_type,tracking_number:str | None,warehouse,created_at:datetime,user_uuid:str}`, separado del modelo de entrada. Validación/stock sin cambio; OpenAPI confirma.

#### `GET /inventory/orders`

- Handler: `routers/inventory.py`, `get_orders`; propósito: historial de movimientos. Entrada: dependencia DB. Consumidor: `uis/backoffice/src/app/backoffice/inventory/orders/page.tsx` lee movimiento, cantidad, fecha, user UUID, SKU, nombre y almacén.
- Original inferido: lista de diccionarios `{id,movement_type,quantity,created_at,user_uuid,sku:{id,name,sku,client_name,category,warehouse}}`; sin modelo; éxito 200; estado ❌. El `OrderResponse` preexistente describía `product`, nombre que no coincide con la salida real.
- Final `list[OrderResponse]`, con `movement_type: Literal["inbound","outbound"]` y `sku: {id,name,sku,warehouse}`. Se eliminan solo `client_name` y `category` no consumidos del objeto anidado; `uis/backoffice/src/types/inventory.ts` queda alineado. TestClient de contrato confirma JSON exacto y exclusión del dato simulado no necesario.

### D. Seguridad y compatibilidad

- Ningún esquema de salida declara `password`, `hashed_password`, token de reseteo ni credenciales internas. Test de login pasa deliberadamente un hash en el registro recibido y comprueba que no aparece en JSON.
- El access token solo se devuelve en endpoints de emisión intencional (`/auth/token`, `/auth/login`, `/users` registro). Los tokens de recuperación permanecen internos.
- `GET /users` omitía exposición útil: su lista era legible por cualquier usuario autenticado y no se encontró consumidor que necesitara emails de terceros. Su salida conserva ID, estado, rol y fecha, pero omite email.
- Login y `/auth/me` conservan el email que requiere `CurrentUser`; `/users/{user_id}` y su PUT conservan email sujeto a la autorización existente. Registro no devuelve email dentro del usuario porque el frontend no consume esa respuesta y luego hace login.
- Se conservan `reported_by_user_id` y `legacy_id`: ambos están declarados por el tipo `Incident` del backoffice. No se cambian rutas, métodos, códigos HTTP, autorización ni reglas de dominio.
- Los campos de inventario anidados del movimiento se reducen a los que consume la vista; el identificador `user_uuid` permanece porque la tabla lo muestra. Las consultas siguen seleccionando las entidades SQLModel completas; no se afirma una optimización de SQL.
- Esquemas de entrada existentes no se ampliaron con campos internos. Respuestas de entrada/salida de inventario quedaron como clases separadas explícitas; las validaciones de requests existentes siguen vigentes.

### E. Verificaciones

- Entorno: dependencias del backend y `pytest` instalados en `.venv` mediante `uv`; `DATABASE_URL` se aisló en SQLite bajo `/tmp` para evitar la ruta SQLite inaccesible de `.env`. Ningún archivo de base local fue usado para pruebas.
- Línea base antes de implementar: `DATABASE_URL=sqlite:////tmp/trackflow-serialization-tests.db PYTHONPATH=services/trackflow-api ./.venv/bin/pytest -q services/trackflow-api/tests` → 39 passed.
- Suite final: `DATABASE_URL=sqlite:////tmp/trackflow-serialization-tests.db PYTHONPATH=services/trackflow-api ./.venv/bin/pytest -q services/trackflow-api/tests` → 43 passed, 1 warning de compatibilidad Starlette/httpx.
- Prueba de perfil tras agregar nulabilidad: `DATABASE_URL=sqlite:////tmp/trackflow-serialization-tests.db PYTHONPATH=services/trackflow-api ./.venv/bin/pytest -q services/trackflow-api/tests/test_profiles.py` → 7 passed.
- Pruebas agregadas focalizadas: `DATABASE_URL=sqlite:////tmp/trackflow-serialization-tests.db PYTHONPATH=services/trackflow-api ./.venv/bin/pytest -q services/trackflow-api/tests/test_serialization_contracts.py` → 3 passed (login sin hash, historial con SKU mínimo, export CSV con media type/cuerpo correctos).
- Frontend: `./uis/backoffice/node_modules/.bin/tsc -p uis/backoffice/tsconfig.json --noEmit` → correcto.
- Peticiones manuales con TestClient: `GET /` 200; `POST /auth/token` 200; `POST /auth/login` 200; `GET /auth/me` 200. Los payloads token/login/me se validaron contra Pydantic y ninguno contenía el hash simulado.
- OpenAPI ejecutado: 33 operaciones en 25 paths; 30 respuestas JSON con esquema explícito; único JSON con esquema vacío `POST /api/incidents/analyze`; export documentado como `text/csv`; `DELETE /suppliers/{supplier_id}` tiene 204 sin contenido.
- El módulo opcional `packages.incidents_analysis` no existe en el checkout. Queda pendiente ejecutar el éxito del analizador, inspeccionar sus campos/consumidores y definir su esquema; no se marca como validado.
- Riesgo de entorno: pytest emite una advertencia deprecando el uso de `httpx` con `starlette.testclient`; no afecta los resultados actuales.
