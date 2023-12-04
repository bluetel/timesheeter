#!/bin/bash

# set -exo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

if [[ -n "${CI}" ]]; then
	echo "DB is started by CI"
else
	echo "Starting DB and Redis"
	# start and import .env.local
	docker compose --env-file .env.local -f docker-compose-dev.yml --project-directory "${SCRIPT_DIR}/.." up -d --remove-orphans
	# "$SCRIPT_DIR/wait-for-local-contanainers.sh"
fi
