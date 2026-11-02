# Guia de claves y API keys: despues de crear el VPS

Esta guia se usa **despues de crear el Droplet, asignarle una IP publica,
instalar Docker y preparar el usuario `deploy`** siguiendo la
[guia principal](./README.es.md).

No hay que pegar ninguna clave real en este README, en commits o en el chat.
Los valores de ejemplo son marcadores, no credenciales utilizables.

## 1. Que necesitas y donde va

| Dato | Como se obtiene | Donde se configura | Obligatorio |
| --- | --- | --- | --- |
| `DO_HOST` | Reserved IP del Droplet en DigitalOcean | GitHub: secreto del environment `production` | Si |
| `DO_USER` | Usuario creado en el VPS: `deploy` | GitHub: secreto de `production` | Si |
| `DO_SSH_PRIVATE_KEY` | Clave SSH privada exclusiva de Actions | GitHub: secreto de `production` | Si |
| `DO_SSH_KNOWN_HOSTS` | Clave publica del host, con huella verificada | GitHub: secreto de `production` | Si |
| `PRODUCTION_BACKOFFICE_URL` | URL HTTPS elegida para el Backoffice | GitHub: variable del repositorio | Si |
| Dominios y `ACME_EMAIL` | Tu DNS y correo de contacto | VPS: `/opt/trackflow/.env` | Si |
| `JWT_SECRET` | Generacion aleatoria propia | VPS: `/opt/trackflow/.env` | Si |
| `QDRANT_API_KEY` | Generacion aleatoria propia | VPS: `/opt/trackflow/.env` | Si |
| `RESEND_API_KEY`, `EMAIL_FROM` | Panel de Resend y remitente verificado | VPS: `/opt/trackflow/.env` | Para enviar correos |
| Claves y modelos RAG | Panel de tus proveedores de IA | VPS: `/opt/trackflow/.env` | Para usar RAG |
| Credenciales de backup externo | Proveedor elegido, por ejemplo Spaces | Configuracion privada de la herramienta de backup en el VPS | Antes de usar datos reales |

**No se requiere una API key de DigitalOcean para actualizar la aplicacion.**
Actions se conecta por SSH al servidor ya creado. Tampoco necesitas crear un
PAT de GitHub para el despliegue normal: el workflow usa `GITHUB_TOKEN` temporal.

### VPS no es VPN

Este plan publica TrackFlow en un **VPS**. No instala WireGuard ni otra VPN,
por lo que no hay `VPN_KEY`, clave privada de WireGuard ni puerto VPN que
configurar. La clave SSH sirve para administrar y desplegar; no es una VPN.
Si se agrega una VPN mas adelante, sus claves y reglas se configuraran aparte.

## 2. Crear la clave SSH para GitHub Actions

Hacerlo en una maquina confiable, no en GitHub ni en un formulario de chat:

```bash
ssh-keygen -t ed25519 -C "trackflow-github-actions" -f ~/.ssh/trackflow_actions
```

Para el workflow actual, dejar la passphrase vacia cuando se solicite: el job
no configura un agente que la desbloquee. Usar esta clave **solo para este
despliegue**, proteger el environment y no reutilizar tu clave personal.

Se generan dos archivos:

- `~/.ssh/trackflow_actions`: **privada**; su contenido completo va en
  `DO_SSH_PRIVATE_KEY`.
- `~/.ssh/trackflow_actions.pub`: **publica**; va en el VPS, dentro de
  `/home/deploy/.ssh/authorized_keys`.

Agregar la publica sin reemplazar otras claves:

```bash
ssh-copy-id -i ~/.ssh/trackflow_actions.pub deploy@IP_PUBLICA
```

Esto requiere que ya tengas una forma autorizada de entrar como `deploy`.
Si no, agregar la publica desde la consola de DigitalOcean con el
administrador, manteniendo propietario `deploy` y permisos `700` para `.ssh`
y `600` para `authorized_keys`.

Probar el acceso antes de continuar:

```bash
ssh -i ~/.ssh/trackflow_actions deploy@IP_PUBLICA 'docker version'
```

Nunca copiar la clave privada al repositorio o a `authorized_keys`.

## 3. Verificar la identidad SSH del VPS

La clave del usuario y la clave del servidor son distintas:

- `DO_SSH_PRIVATE_KEY` demuestra que Actions tiene permiso para entrar.
- `DO_SSH_KNOWN_HOSTS` comprueba que Actions entra al servidor correcto.

Desde la **consola confiable de DigitalOcean**, obtener la huella del servidor:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

En tu maquina confiable, obtener su clave y comparar la huella:

```bash
ssh-keyscan -t ed25519 IP_PUBLICA > trackflow_known_hosts
ssh-keygen -lf trackflow_known_hosts
```

Solo si ambas huellas coinciden, copiar la linea completa de
`trackflow_known_hosts` en el secreto `DO_SSH_KNOWN_HOSTS`. No pegar solamente
la huella `SHA256:...`: el secreto requiere la entrada completa de known_hosts.
Si usas un hostname en `DO_HOST`, usar ese mismo hostname en `ssh-keyscan`.
El workflow utiliza el puerto SSH estandar 22.

No desactivar `StrictHostKeyChecking` ni aceptar una clave nueva sin verificarla.

## 4. Guardar secretos y variable en GitHub

En el repositorio:

1. Ir a **Settings > Environments** y crear `production`.
2. Restringir sus deployment branches a `main`.
3. En **Environment secrets**, crear:
   - `DO_HOST`: la IP publica reservada, sin `http://` ni puerto.
   - `DO_USER`: `deploy`.
   - `DO_SSH_PRIVATE_KEY`: el bloque completo de la privada, incluyendo
     `-----BEGIN OPENSSH PRIVATE KEY-----` y su cierre.
   - `DO_SSH_KNOWN_HOSTS`: la entrada completa verificada en el paso anterior.
4. Ir a **Settings > Secrets and variables > Actions > Variables**.
5. Crear una **repository variable**, no un secret ni una variable exclusiva
   del environment:

```text
PRODUCTION_BACKOFFICE_URL=https://app.trackflow.tudominio.com
```

Los jobs de construccion no usan el environment `production`; por eso esta URL
debe estar disponible como variable del repositorio. No lleva barra final y
debe coincidir con el dominio del Backoffice configurado en el servidor.

## 5. Preparar el archivo privado del servidor

Desde un checkout confiable, copiar la plantilla al VPS:

```bash
scp infra/production/.env.example deploy@IP_PUBLICA:/opt/trackflow/.env
ssh deploy@IP_PUBLICA
chmod 600 /opt/trackflow/.env
nano /opt/trackflow/.env
```

**Hacer esa copia una sola vez**, al configurar un servidor nuevo. No sobrescribir
un `.env` existente: podria borrar claves activas y cerrar sesiones.

Generar dos secretos distintos, ejecutando dos veces en el VPS:

```bash
openssl rand -hex 48
```

Pegar un resultado en `JWT_SECRET` y el otro en `QDRANT_API_KEY`.
Ejemplo de estructura, reemplazando todos los marcadores:

```dotenv
WEBSITE_DOMAIN=trackflow.tudominio.com
BACKOFFICE_DOMAIN=app.trackflow.tudominio.com
API_DOMAIN=api.trackflow.tudominio.com
ACME_EMAIL=tu-correo@tudominio.com

JWT_SECRET=REEMPLAZAR_POR_PRIMER_SECRETO_ALEATORIO
QDRANT_API_KEY=REEMPLAZAR_POR_SEGUNDO_SECRETO_ALEATORIO

RESEND_API_KEY=
EMAIL_FROM="TrackFlow <notifications@tudominio.com>"
```

Los dominios van sin `https://` y sin rutas; el correo ACME debe ser valido.
Las claves no deben contener marcadores como `REEMPLAZAR`.
El Compose de produccion configura automaticamente las URLs internas, SQLite,
la URL publica del frontend y CORS.

### Correos con Resend

1. Verificar un dominio remitente en Resend y sus registros DNS.
2. Crear una API key con los permisos minimos necesarios de envio.
3. Guardarla como `RESEND_API_KEY` en el `.env` del VPS.
4. Usar en `EMAIL_FROM` una direccion del dominio verificado.

Sin esta configuracion no queda habilitado el envio real de recuperacion de
contrasena. No usar el remitente de pruebas como configuracion de produccion.

### IA y RAG, si se utilizan

Completar en ese mismo `.env`:

```dotenv
RAG_COLLECTION_NAME=nombre_de_tu_coleccion
RAG_COMPANY_NAME=nombre_de_tu_empresa
RAG_LANGUAGE=es
RAG_EMBEDDING_API_BASE_URL=URL_DEL_PROVEEDOR_DE_EMBEDDINGS
RAG_EMBEDDING_API_KEY=CLAVE_DEL_PROVEEDOR_DE_EMBEDDINGS
RAG_EMBEDDING_MODEL=MODELO_DE_EMBEDDINGS
RAG_EMBEDDING_DIMENSION=DIMENSION_DEL_MODELO
RAG_GENERATION_API_BASE_URL=URL_DEL_PROVEEDOR_DE_GENERACION
RAG_GENERATION_API_KEY=CLAVE_DEL_PROVEEDOR_DE_GENERACION
RAG_GENERATION_MODEL=MODELO_DE_GENERACION
```

Usar los valores reales documentados por tus proveedores, compatibles con la
integracion del proyecto. La dimension debe coincidir con el modelo y la
coleccion. El despliegue no crea ni indexa automaticamente una coleccion.
No asignar estas claves a variables `NEXT_PUBLIC_*`: serian visibles al cliente.
Si no se usa RAG, dejar sus ajustes opcionales vacios.

## 6. Activar y comprobar

Antes del primer push de produccion:

- [ ] DNS de los tres dominios resuelve a la IP del Droplet.
- [ ] Firewall permite 80/443 y el SSH requerido.
- [ ] La conexion SSH de `deploy` funciona con la clave exclusiva.
- [ ] Los cuatro secretos de GitHub estan completos.
- [ ] Existe la variable del repositorio `PRODUCTION_BACKOFFICE_URL`.
- [ ] `/opt/trackflow/.env` tiene permisos `600` y claves aleatorias propias.
- [ ] El usuario `deploy` puede ejecutar Docker y escribir en `/opt/trackflow`.
- [ ] Se configuro copia cifrada externa antes de usar datos reales.

Integrar los cambios en `main` o ejecutar **Actions > Validate and deploy
production > Run workflow**, seleccionando `main`. Revisar todos los jobs.

Si cambias el `.env` del servidor despues, los contenedores necesitan recrearse:
ejecutar nuevamente el workflow sobre `main` para usar el procedimiento de
backup, comprobaciones y rollback. Si cambias la URL publica del Backoffice,
actualizar tambien la variable del repositorio antes de reconstruir.

El reinicio por si solo no siempre aplica cambios de entorno.

## 7. Errores comunes

| Error | Revisar |
| --- | --- |
| `Permission denied (publickey)` | Usuario, privada completa, publica autorizada y permisos SSH |
| `Host key verification failed` | Entrada known_hosts y huella real del servidor; no omitir la verificacion |
| Timeout de SSH | IP publica, puerto 22 y firewall para el runner |
| Falta `PRODUCTION_BACKOFFICE_URL` | Debe ser variable del repositorio y comenzar con `https://` |
| Falta `JWT_SECRET` o `QDRANT_API_KEY` | Archivo `/opt/trackflow/.env`, campos completos y permisos de lectura de `deploy` |
| HTTPS no funciona | DNS A/AAAA, puertos 80/443, correo ACME y logs de Caddy |
| GHCR devuelve acceso denegado | Permisos de paquetes del repositorio/workflow y acceso del repositorio a los paquetes |
| Login funciona pero no llegan correos | API key de Resend, dominio verificado y remitente |
| RAG no responde | Proveedor, claves, modelos, dimension y coleccion previamente indexada |

## 8. Si se filtra una clave

Revocarla o rotarla en su origen, actualizar su ubicacion correspondiente y
volver a desplegar. Borrarla del ultimo commit no elimina la filtracion del
historial. No mostrarla en capturas ni logs para pedir ayuda.

Rotar `JWT_SECRET` invalida las sesiones existentes. Rotar `QDRANT_API_KEY`
requiere recrear tanto backend como Qdrant. Para SSH, autorizar la nueva publica
y probarla antes de retirar la anterior, salvo que la urgencia exija revocacion
inmediata.
