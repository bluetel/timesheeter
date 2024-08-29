#!/bin/bash

# Make nvm available in the script
. ~/.nvm/nvm.sh
# Use the version of Node specified in .nvmrc
nvm use

# Export .env.local to shell
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

docker compose -f docker-compose-dev.yml up --force-recreate -d

pnpm run -C packages/web migrate:dev

# Run the dev servers concurrently.
# We only want to include the servers that we actually need for most development
# work. If you need to run a server that is not included here, you can run it manually
# in a separate terminal.
concurrently --kill-others \
  "pnpm run -C packages/web dev" \
  "pnpm run -C packages/backhouse dev" \
  --names "@timesheeter/web,@timesheeter/backhouse" \
  --prefix-colors "blue.bold,green.bold"