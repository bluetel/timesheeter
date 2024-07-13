FROM node:18-alpine as builder

WORKDIR /app

# Copy all files
COPY . .

RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Run pnopm build in packages/web using
# skip lint
RUN cd packages/web && pnpm next build
RUN cd packages/backhouse && pnpm build

FROM node:18-alpine as web

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/packages/web/.next .next
COPY --from=builder /app/packages/web/public public
COPY --from=builder /app/packages/web/node_modules node_modules
COPY --from=builder /app/packages/web/next.config.mjs next.config.mjs

CMD ["node_modules/.bin/next", "start"]

FROM node:18-alpine as backhouse

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/packages/backhouse/dist ./dist

CMD ["node", "./dist/app.js"]
