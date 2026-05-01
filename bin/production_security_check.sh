#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PRODUCTION_ENV_FILE:-$ROOT_DIR/.private/deploy/production.env}"
OUTPUT_MODE="summary"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_security_check.sh [--raw]

Runs a read-only security and activity summary against the production host.

This expects the Bastion SSH tunnel to already be available on localhost:2222.
It does not change the remote host.

Options:
  --raw   Print the full raw report instead of the default findings summary.
  --help  Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --raw)
      OUTPUT_MODE="raw"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production env file: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

BASTION_ENV_FILE="${BASTION_ENV_FILE:-$ROOT_DIR/.private/bastion/music-tools.env}"
REMOTE_USER="${REMOTE_USER:-opc}"
REMOTE_RUNTIME_PATH="${REMOTE_RUNTIME_PATH:-/srv/rifferone/app}"
REMOTE_COMPOSE_FILE="${REMOTE_COMPOSE_FILE:-$REMOTE_RUNTIME_PATH/docker-compose.yml}"
REMOTE_COMPOSE_ENV_FILE="${REMOTE_COMPOSE_ENV_FILE:-$REMOTE_RUNTIME_PATH/compose.env}"
NGINX_LOG_PATH="${NGINX_LOG_PATH:-/srv/rifferone/logs/nginx}"
SECURITY_CHECK_SINCE="${SECURITY_CHECK_SINCE:-24 hours ago}"

if [[ ! -f "$BASTION_ENV_FILE" ]]; then
  echo "Missing Bastion env file: $BASTION_ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$BASTION_ENV_FILE"

INSTANCE_SSH_KEY="${INSTANCE_SSH_KEY:-${SSH_KEY:-}}"
LOCAL_PORT="${LOCAL_PORT:-2222}"

if [[ -z "$INSTANCE_SSH_KEY" || ! -f "$INSTANCE_SSH_KEY" ]]; then
  echo "Missing instance SSH private key: ${INSTANCE_SSH_KEY:-unset}" >&2
  exit 1
fi

if ! ssh -i "$INSTANCE_SSH_KEY" \
  -p "$LOCAL_PORT" \
  -o BatchMode=yes \
  -o ConnectTimeout=3 \
  -o StrictHostKeyChecking=accept-new \
  "$REMOTE_USER@localhost" true >/dev/null 2>&1; then
  cat >&2 <<EOF
Production Bastion SSH tunnel is not reachable on localhost:$LOCAL_PORT.

Start the tunnel in another terminal, then rerun this command:

  bash bin/oci_bastion_ssh.sh --no-ssh

If an old Bastion session was left behind after a crash, start a fresh one:

  bash bin/oci_bastion_ssh.sh --no-ssh --new-session
EOF
  exit 1
fi

remote_command="$(printf '%q ' \
  bash -s -- \
  "$REMOTE_RUNTIME_PATH" \
  "$REMOTE_COMPOSE_FILE" \
  "$REMOTE_COMPOSE_ENV_FILE" \
  "$NGINX_LOG_PATH" \
  "$SECURITY_CHECK_SINCE" \
  "$OUTPUT_MODE")"

ssh -i "$INSTANCE_SSH_KEY" -p "$LOCAL_PORT" "$REMOTE_USER@localhost" "$remote_command" <<'EOF'
set -euo pipefail

REMOTE_RUNTIME_PATH="$1"
REMOTE_COMPOSE_FILE="$2"
REMOTE_COMPOSE_ENV_FILE="$3"
NGINX_LOG_PATH="$4"
SECURITY_CHECK_SINCE="$5"
OUTPUT_MODE="$6"

section() {
  printf '\n== %s ==\n' "$1"
}

append_finding() {
  local severity="$1"
  local message="$2"
  findings="${findings}${severity}: ${message}"$'\n'
}

check_line() {
  local status="$1"
  local name="$2"
  local detail="${3:-}"
  if [[ -n "$detail" ]]; then
    printf '[%s] %s: %s\n' "$status" "$name" "$detail"
  else
    printf '[%s] %s\n' "$status" "$name"
  fi
}

print_raw_report() {
  section "Host"
  hostnamectl 2>/dev/null || hostname || true
  printf 'Kernel: '
  uname -r || true
  uptime || true
  date -u '+UTC: %Y-%m-%dT%H:%M:%SZ' || true

  run_or_note "Logged-in users" who
  run_or_note "Recent logins" last -a -n 12
  run_or_note "Recent failed logins" lastb -a -n 12
  run_or_note "Recent sudo/auth events" sudo journalctl --since "$SECURITY_CHECK_SINCE" -p notice..alert -u sshd -u ssh --no-pager -n 80

  section "Sudo-capable users"
  getent group wheel sudo 2>/dev/null || true
  sudo awk -F: '($3 == 0) { print $1 }' /etc/passwd 2>/dev/null || true

  section "Listening ports"
  sudo ss -ltnup 2>/dev/null || ss -ltnup 2>/dev/null || true

  section "Failed systemd units"
  systemctl --failed --no-pager || true

  section "Recent high-priority journal entries"
  sudo journalctl --since "$SECURITY_CHECK_SINCE" -p warning..alert --no-pager -n 120 || true

  section "Docker containers"
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true

  section "Docker images"
  docker images --digests --format 'table {{.Repository}}\t{{.Tag}}\t{{.Digest}}\t{{.CreatedSince}}' 2>/dev/null || true

  section "Docker compose status"
  if [[ -f "$REMOTE_COMPOSE_FILE" && -f "$REMOTE_COMPOSE_ENV_FILE" ]]; then
    docker compose -f "$REMOTE_COMPOSE_FILE" --env-file "$REMOTE_COMPOSE_ENV_FILE" ps 2>/dev/null || true
  else
    echo "Compose files not found: $REMOTE_COMPOSE_FILE / $REMOTE_COMPOSE_ENV_FILE"
  fi

  section "Runtime path summary"
  if [[ -d "$REMOTE_RUNTIME_PATH" ]]; then
    sudo find "$REMOTE_RUNTIME_PATH" -maxdepth 3 -printf '%M %u %g %TY-%Tm-%Td %TH:%TM %p\n' 2>/dev/null | sort | tail -n 120
  else
    echo "Runtime path not found: $REMOTE_RUNTIME_PATH"
  fi

  section "Docker daemon proxy config"
  if [[ -f /etc/docker/daemon.json ]]; then
    sudo sed -E 's#("(http|https)-proxy"[[:space:]]*:[[:space:]]*")[^"]+#\1<redacted>#g' /etc/docker/daemon.json
  else
    echo "No /etc/docker/daemon.json"
  fi

  section "Nginx status summary"
  print_nginx_status_counts

  section "Recent nginx errors"
  if [[ -f "$NGINX_LOG_PATH/error.log" ]]; then
    sudo tail -n 80 "$NGINX_LOG_PATH/error.log" 2>/dev/null || true
  else
    echo "No nginx error log at $NGINX_LOG_PATH/error.log"
  fi
}

run_or_note() {
  local description="$1"
  shift
  section "$description"
  "$@" 2>&1 || true
}

print_nginx_status_counts() {
  if [[ -f "$NGINX_LOG_PATH/access.log" ]]; then
    sudo awk '
      {
        code = $9
        if (code ~ /^[0-9][0-9][0-9]$/) counts[code]++
      }
      END {
        for (code in counts) print code, counts[code]
      }
    ' "$NGINX_LOG_PATH/access.log" 2>/dev/null | sort || true
  else
    echo "No nginx access log at $NGINX_LOG_PATH/access.log"
  fi
}

if [[ "$OUTPUT_MODE" == "raw" ]]; then
  print_raw_report
  exit 0
fi

findings=""
host_name="$(hostname 2>/dev/null || echo unknown)"
utc_now="$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || true)"
uptime_line="$(uptime -p 2>/dev/null || uptime 2>/dev/null || true)"
logged_in_users="$(who 2>/dev/null | awk '{print $1 "@" $2}' | sort -u | xargs 2>/dev/null || true)"
failed_login_count="$(lastb -a -n 50 2>/dev/null | awk 'NF && $1 != "btmp" { count++ } END { print count + 0 }' || true)"
failed_login_count="${failed_login_count:-0}"
failed_units="$(systemctl --failed --no-legend --plain 2>/dev/null | awk 'NF { print $1 }' | xargs 2>/dev/null || true)"
high_priority_count="$(sudo journalctl --since "$SECURITY_CHECK_SINCE" -p warning..alert --no-pager 2>/dev/null | awk 'NF { count++ } END { print count + 0 }' || true)"
high_priority_count="${high_priority_count:-0}"
sudo_users="$(sudo awk -F: '($3 == 0) { print $1 }' /etc/passwd 2>/dev/null | xargs 2>/dev/null || true)"
listening_ports="$(sudo ss -ltnH 2>/dev/null | awk '{ split($4, parts, ":"); print parts[length(parts)] }' | sort -n | uniq | xargs 2>/dev/null || true)"
container_summary="$(docker ps --format '{{.Names}}={{.Status}}' 2>/dev/null | xargs 2>/dev/null || true)"
compose_summary=""
if [[ -f "$REMOTE_COMPOSE_FILE" && -f "$REMOTE_COMPOSE_ENV_FILE" ]]; then
  compose_summary="$(docker compose -f "$REMOTE_COMPOSE_FILE" --env-file "$REMOTE_COMPOSE_ENV_FILE" ps --format '{{.Name}}={{.State}}' 2>/dev/null | xargs 2>/dev/null || true)"
else
  append_finding "WARN" "production compose files were not found"
fi
nginx_status_counts="$(print_nginx_status_counts | xargs 2>/dev/null || true)"
nginx_error_count=0
if [[ -f "$NGINX_LOG_PATH/error.log" ]]; then
  nginx_error_count="$(sudo tail -n 200 "$NGINX_LOG_PATH/error.log" 2>/dev/null | awk 'NF { count++ } END { print count + 0 }' || true)"
  nginx_error_count="${nginx_error_count:-0}"
else
  append_finding "WARN" "nginx error log was not found at $NGINX_LOG_PATH/error.log"
fi

if [[ "$failed_login_count" -gt 0 ]]; then
  append_finding "WARN" "recent failed login records found: $failed_login_count"
fi
if [[ -n "$failed_units" ]]; then
  append_finding "WARN" "failed systemd units: $failed_units"
fi
if [[ "$high_priority_count" -gt 0 ]]; then
  append_finding "INFO" "warning-or-higher journal entries since '$SECURITY_CHECK_SINCE': $high_priority_count"
fi
if [[ "$nginx_error_count" -gt 0 ]]; then
  append_finding "INFO" "recent nginx error log lines: $nginx_error_count"
fi

printf 'Production security check summary\n'
printf 'Host: %s\n' "$host_name"
printf 'UTC: %s\n' "$utc_now"
printf 'Uptime: %s\n' "${uptime_line:-unknown}"

printf '\nChecks:\n'
check_line "OK" "host identity" "${host_name:-unknown}"
check_line "OK" "logged-in users" "${logged_in_users:-none}"
check_line "OK" "sudo/root users" "${sudo_users:-unknown}"
check_line "OK" "listening TCP ports" "${listening_ports:-unknown}"
check_line "OK" "docker containers" "${container_summary:-none}"
if [[ -n "$compose_summary" ]]; then
  check_line "OK" "docker compose status" "$compose_summary"
else
  check_line "WARN" "docker compose status" "not available"
fi
check_line "OK" "nginx status counts" "${nginx_status_counts:-unknown}"

if [[ "$failed_login_count" -gt 0 ]]; then
  check_line "WARN" "failed login check" "$failed_login_count recent records"
else
  check_line "OK" "failed login check" "no recent failed login records"
fi
if [[ -n "$failed_units" ]]; then
  check_line "WARN" "systemd failed units" "$failed_units"
else
  check_line "OK" "systemd failed units" "none"
fi
if [[ "$high_priority_count" -gt 0 ]]; then
  check_line "INFO" "journal warnings" "$high_priority_count warning-or-higher entries since '$SECURITY_CHECK_SINCE'"
else
  check_line "OK" "journal warnings" "none since '$SECURITY_CHECK_SINCE'"
fi
if [[ "$nginx_error_count" -gt 0 ]]; then
  check_line "INFO" "nginx errors" "$nginx_error_count recent error log lines"
else
  check_line "OK" "nginx errors" "none in recent tail"
fi

printf '\nFindings:\n'
if [[ -n "$findings" ]]; then
  printf '%s' "$findings"
else
  printf 'OK: no obvious unusual activity found in the summary checks\n'
fi

printf '\nFor raw detail, run: bash bin/production_security_check.sh --raw\n'
EOF
