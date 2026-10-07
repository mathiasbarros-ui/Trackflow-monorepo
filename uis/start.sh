#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

npm --prefix website ci --no-audit --no-fund
npm --prefix backoffice ci --no-audit --no-fund

website_pid=""
backoffice_pid=""

cleanup() {
  trap - EXIT INT TERM
  if [[ -n "$website_pid" ]]; then kill "$website_pid" 2>/dev/null || true; fi
  if [[ -n "$backoffice_pid" ]]; then kill "$backoffice_pid" 2>/dev/null || true; fi
  wait || true
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

npm --prefix website run dev -- --webpack --hostname "$UI_HOST" --port "$WEBSITE_PORT" &
website_pid=$!
npm --prefix backoffice run dev -- --webpack --hostname "$UI_HOST" --port "$BACKOFFICE_PORT" &
backoffice_pid=$!

status=0
wait -n "$website_pid" "$backoffice_pid" || status=$?
if [[ "$status" -eq 0 ]]; then status=1; fi
exit "$status"