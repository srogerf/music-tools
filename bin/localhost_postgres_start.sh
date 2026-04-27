#!/usr/bin/env bash

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat >&2 <<'EOF'
Usage: bash bin/localhost_postgres_start.sh

Starts the local Postgres cluster used for dev/test and opens psql on port 5435.
EOF
  exit 0
fi

sudo pg_ctlcluster 16 main start
sudo -u postgres psql -p 5435
