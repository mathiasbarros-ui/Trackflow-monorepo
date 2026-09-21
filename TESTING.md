## El testing se encuentra en la carpeta ./services/trackflow-api/tests

## se usa la herramienta pytest para Fastapi


## Tests de autenticacion

## Endpoints

# test_login.py y test_token.py

Se probarán los endpoints de autenticacion `/auth/login`, `/auth/token`,
`/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password` y
`/auth/me`.

`Camino exitoso`
Respuestas correctas con credenciales, tokens y datos validos.

`Caso limite`
Campos obligatorios ausentes, contraseñas en el minimo permitido, perfiles
vacios, usuarios sin perfil y solicitudes de recuperación para emails no
registrados.

`Modo fallo`
Credenciales incorrectas, contrasenñs actuales invalidas, tokens invalidos o
expirados y solicitudes sin autenticación.


# test_change_password.py, test_password_recovery.py y test_me.py

Se probarán `GET /profiles/me` y `PUT /profiles/me`.

`Camino exitoso`
Consulta y actualización del perfil autenticado.

`Caso limite`
Campos opcionales vacios y cuerpo de actualización vacio.

`Modo fallo`
Perfil inexistente y solicitudes sin autenticación.


# test_profiles.py

Se prueban `GET /profiles/me` y `PUT /profiles/me`.

`Camino exitoso`
Consulta y actualización del perfil autenticado.

`Caso limite`
Campos opcionales vacios y cuerpo de actualización vacio.

`Modo fallo`
Perfil inexistente y solicitudes sin autenticación.


# test_users.py

Se probarán `POST /users`, `GET /users` y las operaciones
`GET`, `PUT` y `DELETE /users/{user_id}`.

`Camino exitoso`
Registro, listado, consulta, actualización y eliminación de usuarios.

`Caso limite`
Contraseña minima, listado vacio, usuario inexistente y cuerpos vacios.

`Modo fallo`
Email duplicado, usuario sin permisos y solicitudes sin autenticación.


## Cobertura esperada

Los archivos dentro de `services/trackflow-api/tests` usan pytest y TestClient,
reemplazando los servicios de persistencia con mocks para no modificar la base
de datos real. La suite debe alcanzar como minimo un 70% de cobertura en
`app/auth`.

Para ejecutar todos los tests y mostrar la cobertura en la terminal, partiendo
de la raíz del proyecto:

```bash
uv run --project services/trackflow-api pytest --cov=services/trackflow-api/app/auth --cov-report=term-missing services/trackflow-api/tests -v
```

El resultado se muestra directamente en la terminal. La suite contiene 39
tests y cada endpoint tiene camino exitoso, caso limite y modo fallo.

Para ejecutar los tests desde el backend sin cobertura:

```bash
cd services/trackflow-api
uv run pytest tests -v
```
