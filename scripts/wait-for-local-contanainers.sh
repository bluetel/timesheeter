#!/bin/bash

set -ex

function testcmd {
  docker-compose exec -T local-db psql -U -c "select 'postgres is alive'"
}

TRIES=0
until testcmd; do
  echo "Postgres is unavailable - sleeping"
  sleep 0.1

  TRIES=$((TRIES + 1))
  if [ "$TRIES" -gt "10" ]; then
    >&2 echo "Postgres is unavailable - giving up"
    exit 1
  fi
done

>&2 echo "Postgres is up - continuing"
exit 0
