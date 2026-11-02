#!/usr/bin/env bash
set -euo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP="$(mktemp -d)"
PROJECT="trackflow-check-$$"
export WEBSITE_DOMAIN=trackflow.example.com
export BACKOFFICE_DOMAIN=app.trackflow.example.com
export API_DOMAIN=api.trackflow.example.com
export ACME_EMAIL=admin@example.com
export JWT_SECRET=container-validation-only
export QDRANT_API_KEY=container-validation-only
export TRACKFLOW_ENV_FILE=/dev/null
export IMAGE_PREFIX=trackflow-production-check
export IMAGE_TAG=local

for app in backend website backoffice; do
  docker tag "trackflow-production-check-$app:local" "$IMAGE_PREFIX/$app:$IMAGE_TAG"
done

cat > "$TEMP/override.yaml" <<YAML
services:
  backup:
    volumes:
      - backup_test:/backups
volumes:
  backend_database:
    name: $PROJECT-backend
  qdrant_storage:
    name: $PROJECT-qdrant
  caddy_data:
    name: $PROJECT-caddy-data
  caddy_config:
    name: $PROJECT-caddy-config
  backup_test:
    name: $PROJECT-backups
YAML

compose() {
  docker compose --project-name "$PROJECT" -f "$SOURCE/compose.yaml" \
    -f "$TEMP/override.yaml" "$@"
}

cleanup() {
  local result=$?
  trap - EXIT INT TERM
  if (( result != 0 )); then compose logs --tail=80 >&2; fi
  if ! compose --profile operations down --volumes --remove-orphans; then result=1; fi
  rm -rf -- "$TEMP"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

compose config --quiet
compose up -d --wait --wait-timeout 180 backend website backoffice
compose exec -T website node -e \
  "fetch('http://localhost:3000/').then(r=>r.text()).then(t=>{if(!t.includes('https://app.example.com/login')||!t.includes('API disponible'))throw Error('Website link or API status check failed')})"
compose exec -T backoffice node -e \
  "fetch('http://localhost:3000/backend/openapi.json').then(async r=>{if(!r.ok||!(await r.text()).includes('TrackFlow API'))throw Error('Backoffice API proxy check failed')})"

compose exec -T backend sh -c 'echo persistent-data > database/production-test.txt'
compose stop backend qdrant
compose run --rm --no-deps -T -e BACKUP_NAME=test.tar.gz backup
# shellcheck disable=SC2016
compose run --rm --no-deps -T --entrypoint /bin/sh backup -ec \
  'mkdir /restore; tar -xzf /backups/test.tar.gz -C /restore; test "$(cat /restore/backend/production-test.txt)" = persistent-data; test -f /restore/backend/trackflow.db; test -f /restore/backend/trackflow_db.json; test -d /restore/qdrant'
compose up -d --wait --wait-timeout 180 backend qdrant
# shellcheck disable=SC2016
compose exec -T backend sh -c 'test "$(cat database/production-test.txt)" = persistent-data'

echo "Container integration tests passed."
