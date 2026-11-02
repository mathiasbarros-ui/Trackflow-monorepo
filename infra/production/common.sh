#!/usr/bin/env bash
set -euo pipefail

ROOT="${TRACKFLOW_ROOT:-/opt/trackflow}"
RELEASE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export TRACKFLOW_ENV_FILE="$ROOT/.env"
export BACKUP_DIR="$ROOT/backups"

compose() {
  docker compose --project-name trackflow-production \
    --env-file "$TRACKFLOW_ENV_FILE" --env-file "$RELEASE/release.env" \
    -f "$RELEASE/compose.yaml" "$@"
}

check_config() {
  test -f "$TRACKFLOW_ENV_FILE"
  test -f "$RELEASE/release.env"
  compose config --quiet
}

backup_data() (
  compose --profile operations pull backup
  # shellcheck disable=SC2317
  restart_after_backup() {
    local result=$?
    trap - EXIT INT TERM
    if ! compose up -d --wait --wait-timeout 180 qdrant backend; then
      result=1
    fi
    if (( result != 0 )); then
      echo "ERROR: backup or service restart failed; inspect production immediately." >&2
    fi
    exit "$result"
  }
  trap restart_after_backup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"
  compose stop backend qdrant
  compose run --rm --no-deps -T \
    -e "BACKUP_NAME=$(date -u +%Y%m%dT%H%M%S)-${RANDOM}.tar.gz" \
    backup
)
