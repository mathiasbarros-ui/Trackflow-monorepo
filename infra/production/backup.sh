#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

exec 9>"$ROOT/deploy.lock"
flock -w 600 9
check_config
backup_data
echo "Backup completed in $BACKUP_DIR. Copy it to encrypted off-site storage."
