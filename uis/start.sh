#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

resolve_public_url() {
  node --input-type=module - "$1" <<'JS'
const url = new URL(process.argv[2]);
const { CODESPACE_NAME, GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN } = process.env;
if (
  CODESPACE_NAME && GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN &&
  url.protocol === "http:" &&
  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
  url.port && url.pathname === "/" && !url.search && !url.hash
) {
  console.log(`https://${CODESPACE_NAME}-${url.port}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`);
} else {
  console.log(process.argv[2].replace(/\/$/, ""));
}
JS
}

NEXT_PUBLIC_BACKOFFICE_URL="$(resolve_public_url "${NEXT_PUBLIC_BACKOFFICE_URL:-http://localhost:3001}")"
NEXT_PUBLIC_WEBSITE_URL="$(resolve_public_url "${NEXT_PUBLIC_WEBSITE_URL:-http://localhost:3000}")"
export NEXT_PUBLIC_BACKOFFICE_URL NEXT_PUBLIC_WEBSITE_URL

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