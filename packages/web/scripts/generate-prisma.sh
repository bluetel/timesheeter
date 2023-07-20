#!/bin/sh

cd ../../

if [ -f .env.local ]; then
  cp .env.local packages/web/.env
elif [ -f .env.staging ]; then
  cp .env.staging packages/web/.env
elif [ -f .env.production ]; then
  cp .env.production packages/web/.env
fi

cd packages/web

pnpm prisma generate

# Try and push to database, but ignore errors
pnpm prisma db push --preview-feature --accept-data-loss || true

if [ -f .env ]; then
  rm .env
fi
