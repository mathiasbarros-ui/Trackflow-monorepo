#!/usr/bin/env bash
set -euo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP="$(mktemp -d)"
trap 'rm -rf -- "$TEMP"' EXIT
mkdir -p "$TEMP/bin" "$TEMP/root/releases"/{old,new}
export TRACKFLOW_ROOT="$TEMP/root"
export CALLS="$TEMP/calls"
export PATH="$TEMP/bin:$PATH"

cat > "$TEMP/bin/docker" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
echo "$*" >> "$CALLS"
if [[ "$*" == *" run "* && "${FAIL_BACKUP:-0}" == 1 ]]; then exit 1; fi
if [[ "$*" == *" pull"* && "${FAIL_PULL:-0}" == 1 ]]; then exit 1; fi
if [[ "$*" == *" stop "* && "${FAIL_STOP:-0}" == 1 ]]; then exit 1; fi
if [[ "$*" == *" up "* && "$*" == *"qdrant backend"* && "${FAIL_RESTART:-0}" == 1 ]]; then exit 1; fi
if [[ "$*" == *" up "* && "$*" == *"/new/compose.yaml"* && "${FAIL_UP:-0}" == 1 ]]; then exit 1; fi
if [[ "$*" == *" exec "* && "${FAIL_SMOKE:-0}" == 1 ]]; then exit 1; fi
if [[ "$*" == *" exec "* && "$*" == *"/new/compose.yaml"* && "${FAIL_NEW_SMOKE:-0}" == 1 ]]; then exit 1; fi
SH
cat > "$TEMP/bin/sleep" <<'SH'
#!/usr/bin/env bash
exit 0
SH
chmod +x "$TEMP/bin/docker" "$TEMP/bin/sleep"
touch "$TRACKFLOW_ROOT/.env"
for release in old new; do
  cp "$SOURCE"/{common.sh,deploy.sh,backup.sh} "$TRACKFLOW_ROOT/releases/$release/"
  touch "$TRACKFLOW_ROOT/releases/$release"/{compose.yaml,release.env}
done

reset_case() {
  rm -f "$TRACKFLOW_ROOT/current"
  : > "$CALLS"
  unset FAIL_BACKUP FAIL_PULL FAIL_UP FAIL_SMOKE FAIL_NEW_SMOKE FAIL_STOP FAIL_RESTART
}

expect_failure() {
  if bash "$TRACKFLOW_ROOT/releases/new/deploy.sh"; then
    echo "Expected deployment failure" >&2
    exit 1
  fi
}

assert_no_call() {
  if grep -q "$1" "$CALLS"; then
    echo "Unexpected Docker call matching: $1" >&2
    exit 1
  fi
}

reset_case
bash "$TRACKFLOW_ROOT/releases/new/deploy.sh"
test "$(readlink -f "$TRACKFLOW_ROOT/current")" = "$TRACKFLOW_ROOT/releases/new"
assert_no_call " run "

reset_case
ln -s "$TRACKFLOW_ROOT/releases/old" "$TRACKFLOW_ROOT/current"
bash "$TRACKFLOW_ROOT/releases/new/deploy.sh"
grep -q "/old/compose.yaml stop backend qdrant" "$CALLS"
grep -q " run .* backup" "$CALLS"
test "$(readlink -f "$TRACKFLOW_ROOT/current")" = "$TRACKFLOW_ROOT/releases/new"

reset_case
ln -s "$TRACKFLOW_ROOT/releases/old" "$TRACKFLOW_ROOT/current"
export FAIL_UP=1
expect_failure
test "$(readlink -f "$TRACKFLOW_ROOT/current")" = "$TRACKFLOW_ROOT/releases/old"
grep -q "/old/compose.yaml up .*--remove-orphans" "$CALLS"

reset_case
ln -s "$TRACKFLOW_ROOT/releases/old" "$TRACKFLOW_ROOT/current"
export FAIL_BACKUP=1
expect_failure
grep -q "/old/compose.yaml up .*qdrant backend" "$CALLS"
assert_no_call "/new/compose.yaml up "

reset_case
ln -s "$TRACKFLOW_ROOT/releases/old" "$TRACKFLOW_ROOT/current"
export FAIL_PULL=1
expect_failure
assert_no_call " stop "

reset_case
ln -s "$TRACKFLOW_ROOT/releases/old" "$TRACKFLOW_ROOT/current"
export FAIL_NEW_SMOKE=1
expect_failure
test "$(readlink -f "$TRACKFLOW_ROOT/current")" = "$TRACKFLOW_ROOT/releases/old"
grep -q "/old/compose.yaml exec " "$CALLS"

reset_case
ln -s "$TRACKFLOW_ROOT/releases/old" "$TRACKFLOW_ROOT/current"
export FAIL_STOP=1
expect_failure
grep -q "/old/compose.yaml up .*qdrant backend" "$CALLS"
assert_no_call " run "

reset_case
ln -s "$TRACKFLOW_ROOT/releases/old" "$TRACKFLOW_ROOT/current"
export FAIL_RESTART=1
expect_failure
assert_no_call "/new/compose.yaml up "

reset_case
export FAIL_SMOKE=1
expect_failure
test ! -L "$TRACKFLOW_ROOT/current"

echo "Deployment regression tests passed."
