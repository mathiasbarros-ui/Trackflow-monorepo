# TrackFlow en DigitalOcean

Despliegue de un unico Droplet con Docker Compose, IP publica reservada y
actualizacion automatica desde `main`. La configuracion local de desarrollo no
cambia. Este directorio no crea recursos ni incurre en cargos por si mismo.

Despues de preparar el VPS, seguir la
[guia de claves y API keys](./README.claves.es.md) para configurar SSH, GitHub,
JWT, Qdrant, correo y proveedores de IA sin publicar secretos.

## Arquitectura y limites

- Caddy publica Website, Backoffice y FastAPI con HTTPS automatico.
- Solo Caddy publica puertos. Qdrant y las aplicaciones usan la red de Docker.
- GitHub Actions prueba el backend, comprueba tipos y compila ambos frontends,
  construye imagenes y las publica en GHCR con el SHA del commit y el
  identificador de ejecucion/intento. Reejecutar un commit no reemplaza las
  etiquetas de una release anterior, preservando el rollback.
- La compilacion de produccion usa `next build --webpack`, consistente con el
  bundler del arranque de desarrollo y sin modificar los scripts locales.
- El VPS descarga imagenes; no compila ni necesita clonar el repositorio.
- Cada intento tiene su directorio de release; `current` identifica el ultimo
  despliegue que paso las comprobaciones HTTPS.
- Los despliegues y backups comparten un bloqueo local. No se cancelan
  despliegues en curso cuando llega otro push.
- Antes de desplegar, Actions omite commits que ya no sean el HEAD de `main`,
  evitando que una compilacion antigua reemplace una version mas reciente.
- Hay interrupciones breves al respaldar y reemplazar contenedores. Un unico
  Droplet no proporciona alta disponibilidad.

## 1. Crear y proteger el servidor

En DigitalOcean, crear un Droplet **Ubuntu 24.04 LTS, x86_64, 2 vCPU / 4 GiB**
o superior. Elegir una region cercana a los usuarios y agregar una clave SSH.
Asignarle una Reserved IP en la misma region.

Configurar un **DigitalOcean Cloud Firewall** asociado al Droplet:

| Entrada | Origen |
| --- | --- |
| TCP 80 y 443 | Internet, IPv4 e IPv6 si se utiliza |
| TCP 22 | Administradores y runners de despliegue |
| Resto | Denegado |

Los runners hospedados de GitHub no tienen una IP fija pequena. Usar un runner
con salida fija si se necesita restringir SSH por IP. Para el arranque inicial
se puede permitir TCP 22 desde Internet con autenticacion exclusiva por clave,
sin root y con proteccion contra intentos repetidos. No abrir 3000, 3001, 8000,
6333 ni 6334. No confiar exclusivamente en UFW: los puertos publicados por Docker
requieren tambien control en el firewall de DigitalOcean.

Instalar Docker Engine y el plugin Compose desde el repositorio oficial:
<https://docs.docker.com/engine/install/ubuntu/>.
Se requiere Compose 2.24 o posterior, `curl`, `flock` y `openssl`.

Crear el usuario de despliegue como administrador del servidor:

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
sudo install -d -m 750 -o deploy -g deploy /opt/trackflow
sudo -u deploy mkdir -p /opt/trackflow/releases
sudo -u deploy mkdir -m 700 /opt/trackflow/backups
```

Agregar una **clave publica exclusiva de Actions** a
`/home/deploy/.ssh/authorized_keys` con permisos `600` y propietario `deploy`.
El usuario del grupo `docker` tiene privilegios equivalentes a root: proteger
esta clave como una credencial administrativa.

Tras comprobar el acceso del administrador y de `deploy`, desactivar
`PasswordAuthentication` y `PermitRootLogin` en SSH; validar con `sshd -t`
antes de recargar SSH. No cerrar la sesion administrativa hasta probar otra.

## 2. Dominio y secretos del servidor

Crear registros DNS A apuntando a la Reserved IP:

- `trackflow.tudominio.com`: Website.
- `app.trackflow.tudominio.com`: Backoffice.
- `api.trackflow.tudominio.com`: API.

No crear registros AAAA si no se ha configurado y probado IPv6. Los dominios
deben resolver al servidor y los puertos 80/443 estar accesibles para emitir TLS.
Una IP sin dominio no sirve para esta configuracion de certificados publicos.

Copiar `.env.example` de este directorio a `/opt/trackflow/.env` y editarlo en
el servidor, como `deploy`:

```bash
chmod 600 /opt/trackflow/.env
openssl rand -hex 48
openssl rand -hex 48
```

Usar los dos resultados diferentes como `JWT_SECRET` y `QDRANT_API_KEY`.
Completar dominios, correo ACME y, si corresponde, Resend y proveedores RAG.
No enviar secretos por chat, ni agregarlos al repositorio o las imagenes.
Los tres dominios deben ser diferentes. Mantener `JWT_SECRET` estable para
preservar sesiones entre despliegues.

RAG_DOCUMENTS_DIR, si se usa, debe apuntar a documentos incluidos en la imagen
o a un volumen de solo lectura agregado explicitamente. El despliegue no monta
el repositorio, los datasets ni documentos locales del desarrollador.

## 3. Configurar GitHub

Crear el environment **production**. Limitarlo a la rama `main`; agregar
aprobacion manual si se desea. Con aprobacion, la actualizacion esperara esa
aprobacion antes de modificar el VPS.

Configurar estos secretos en ese environment:

| Secreto | Contenido |
| --- | --- |
| `DO_HOST` | Reserved IPv4 publica o hostname del servidor |
| `DO_USER` | `deploy` |
| `DO_SSH_PRIVATE_KEY` | Clave privada exclusiva de despliegue |
| `DO_SSH_KNOWN_HOSTS` | Entrada completa de known_hosts verificada |

Verificar la huella SSH desde la consola confiable de DigitalOcean y compararla
con la clave obtenida del servidor. No confiar automaticamente en `ssh-keyscan`
ejecutado durante el despliegue; el workflow exige una identidad preconfigurada.

Crear ademas la **variable del repositorio** (no solo del environment):

```text
PRODUCTION_BACKOFFICE_URL=https://app.trackflow.tudominio.com
```

Next.js integra `NEXT_PUBLIC_*` en la compilacion. Esta URL debe coincidir con
`BACKOFFICE_DOMAIN` del VPS. Cambiarla requiere reconstruir las imagenes.
`BACKEND_API_URL=http://backend:8000` es interno, nunca una URL del navegador.

Habilitar Actions y el permiso de escritura de paquetes para `GITHUB_TOKEN`.
No se necesita un token de DigitalOcean: la infraestructura se crea una vez,
y el workflow despliega por SSH. El token temporal de GHCR se elimina del
servidor al finalizar el job.

Proteger `main` con pull requests y comprobaciones obligatorias de backend,
frontend e imagenes. Con el workflow sin configurar, los pushes de produccion
fallaran explicitamente; no hay despliegues incompletos que aparenten exito.

## 4. Primer despliegue y validacion

Integrar estos archivos y los cambios de aplicacion necesarios en `main`.
No publicar una configuracion que dependa de archivos locales sin versionar.
Tambien se puede ejecutar el workflow manualmente sobre `main`.

Verificar en Actions que se completan las pruebas, las tres imagenes y el job
`deploy`. Luego comprobar:

1. Website accesible con certificado valido y enlaces al Backoffice correcto.
2. Registro, login y consultas del Backoffice.
3. La API responde por HTTPS; no se puede conectar directamente a sus puertos.
4. Crear un dato de prueba, desplegar un cambio y verificar que sigue presente.
5. Reiniciar el Droplet y comprobar servicios, datos y autenticacion.
6. Revisar el resumen de Actions y la release activa.

Como `deploy`, para operar la release activa:

```bash
cd /opt/trackflow/current
export TRACKFLOW_ENV_FILE=/opt/trackflow/.env
docker compose --project-name trackflow-production \
  --env-file /opt/trackflow/.env --env-file release.env \
  -f compose.yaml ps
docker compose --project-name trackflow-production \
  --env-file /opt/trackflow/.env --env-file release.env \
  -f compose.yaml logs --tail=100
```

Un segundo despliegue fallido intenta volver a la release anterior y deja
Actions en estado fallido incluso si el rollback funciona. Un primer despliegue
fallido no tiene version anterior: revisar logs y corregir antes de reintentar.
Los checks HTTPS se ejecutan desde el contenedor proxy mediante DNS publico;
agregar un monitor externo para comprobar accesibilidad desde fuera del VPS.

## 5. Backups

**Hay SQLite y TinyDB (JSON)**. Copiar solamente `trackflow.db` pierde usuarios
y otros datos. El script detiene backend y Qdrant, archiva ambos volumenes
completos y los vuelve a iniciar, incluso si falla el archivado.
Los frontends siguen levantados pero las operaciones de API fallan durante
esta pausa. No se ejecutan seeds automaticamente.

Ejecutar como `deploy`:

```bash
bash /opt/trackflow/current/backup.sh
```

Instalar un cron diario mediante `crontab -e` del usuario `deploy`:

```cron
0 3 * * * /bin/bash /opt/trackflow/current/backup.sh >> /opt/trackflow/backup.log 2>&1
```

Cada despliegue posterior al primero tambien crea un backup antes del cambio.
Los archivos quedan con permisos privados en `/opt/trackflow/backups`.
El cron es un punto de partida: configurar alertas por error y por antiguedad
del ultimo backup; revisar y rotar tambien `backup.log`.

**Antes de usar datos reales**, configurar copia cifrada fuera del Droplet,
por ejemplo a DigitalOcean Spaces, con credenciales y herramienta de backup
administradas en el servidor. Este repositorio no configura ese proveedor ni
elimina copias automaticamente. Aplicar retencion de 7 diarias y 4 semanales
solo despues de verificar la copia externa. Monitorizar espacio para que los
backups o las imagenes antiguas no llenen el disco.

Guardar tambien una copia cifrada de `.env`. Los certificados de Caddy se
pueden reemitir; sus volumenes no estan incluidos en el archivo de datos.

### Restauracion de prueba

Probar primero en otro Droplet aislado, con la misma version de Qdrant y de
aplicacion que genero el backup. No restaurar sobre produccion en uso.
Los archivos contienen `backend/` y `qdrant/`:

```bash
tar -tzf /ruta/backup.tar.gz
```

Con los contenedores de destino detenidos, crear los dos volumenes y restaurar
el archivo (montar el backup solo lectura):

```bash
docker volume create trackflow-production-backend
docker volume create trackflow-production-qdrant
docker run --rm --network none \
  -v trackflow-production-backend:/restore/backend \
  -v trackflow-production-qdrant:/restore/qdrant \
  -v /ruta/backup.tar.gz:/backup.tar.gz:ro \
  alpine:3.22.2 tar -xzf /backup.tar.gz -C /restore
```

Usar volumenes vacios: extraer sobre datos anteriores deja archivos que ya no
existen en el backup. No borrar volumenes de produccion como parte del test.
Restaurar el entorno secreto, iniciar la release correspondiente y comprobar
login, SQLite, datos JSON y consultas RAG. Registrar duracion y resultado.

## 6. Migraciones, rollback y mantenimiento

La aplicacion actual crea tablas al arrancar; no hay un sistema de migraciones
versionadas agregado por este despliegue. Antes de cambios de esquema, preparar
y probar una migracion compatible con la version anterior. Si no es compatible,
planificar mantenimiento y no depender del rollback automatico de imagenes.
Las actualizaciones de Qdrant tambien requieren revisar compatibilidad de
almacenamiento antes de cambiar la version fijada.

El rollback **no restaura bases de datos automaticamente**: hacerlo podria
eliminar escrituras posteriores al backup. Las restauraciones de datos son una
operacion manual con mantenimiento y autorizacion.

Para volver manualmente a una release conocida, ejecutar su script:

```bash
bash /opt/trackflow/releases/RELEASE_CONOCIDA/deploy.sh
```

Necesita autenticacion temporal en GHCR si las imagenes privadas no estan en
cache. Usar un token con permiso exclusivo de lectura de paquetes y eliminar
las credenciales despues. El script respalda el estado actual antes del cambio.
No ejecutar `docker compose down -v`, `docker system prune --volumes` ni limpieza
global: eliminaria datos o afectaria otros proyectos del host.

Revisar mensualmente parches del host, versiones fijadas de Caddy/Qdrant,
capacidad, backup externo y restauracion. El despliegue actualiza TrackFlow,
no reemplaza automaticamente el sistema operativo del VPS.

## Validacion local de infraestructura

```bash
bash -n infra/production/*.sh infra/production/tests/deployment.sh
bash infra/production/tests/deployment.sh
docker build -f infra/production/Dockerfile.backend -t trackflow-backend-check .
docker build -f infra/production/Dockerfile.frontend \
  --build-arg APP=website \
  --build-arg NEXT_PUBLIC_BACKOFFICE_URL=https://app.example.com \
  -t trackflow-website-check .
docker build -f infra/production/Dockerfile.frontend \
  --build-arg APP=backoffice -t trackflow-backoffice-check .
```

Las pruebas del script usan Docker simulado: verifican primer despliegue,
backup, rollback, fallos de descarga y de HTTPS sin tocar servicios reales.
Despues de construir las tres imagenes con los tags
`trackflow-production-check-backend:local`,
`trackflow-production-check-website:local` y
`trackflow-production-check-backoffice:local`, se puede ejecutar
`bash infra/production/tests/containers.sh`. Usa red y volumenes aislados,
sin puertos publicados, y los elimina al terminar. Verifica las aplicaciones,
el proxy del Backoffice, el archivado de datos y su persistencia tras reiniciar.
La validacion del VPS, TLS, backups externos y restauracion debe realizarse
despues de aprovisionar la infraestructura.
