#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

exec 9>"$ROOT/deploy.lock"
flock -w 600 9
check_config

previous=""
if [[ -L "$ROOT/current" ]]; then
  previous="$(readlink -f "$ROOT/current")"
fi
compose pull

if [[ -n "$previous" ]]; then
  RELEASE="$previous" backup_data
fi

smoke_test() {
  local attempt
  for ((attempt=1; attempt<=12; attempt++)); do
    # shellcheck disable=SC2016
    if compose exec -T proxy sh -ec '
      wget -q -O /dev/null "https://$WEBSITE_DOMAIN/"
      wget -q -O /dev/null "https://$BACKOFFICE_DOMAIN/login"
      wget -q -O /dev/null "https://$API_DOMAIN/"
    '; then
      return 0
    fi
    sleep 10
  done
  echo "ERROR: public HTTPS checks failed." >&2
  return 1
}

if compose up -d --wait --wait-timeout 180 --remove-orphans && smoke_test; then
  ln -sfn "$RELEASE" "$ROOT/current.next"
  mv -Tf "$ROOT/current.next" "$ROOT/current"
  echo "Deployment succeeded: $RELEASE"
else
  echo "ERROR: deployment failed." >&2
  if [[ -n "$previous" ]]; then
    RELEASE="$previous"
    if compose up -d --wait --wait-timeout 180 --remove-orphans && smoke_test; then
      echo "Previous release restored. Data was NOT restored." >&2
    else
      echo "ERROR: rollback failed; immediate manual intervention required." >&2
    fi
  else
    echo "No previous release exists; inspect containers before retrying." >&2
  fi
  exit 1
fi
