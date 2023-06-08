FROM node:18-alpine AS runner
WORKDIR /app

COPY . /app

RUN yarn install --frozen-lockfile --non-interactive --production=false

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

EXPOSE 3000

ENV PORT 3000

WORKDIR /app/packages/app

CMD ["yarn", "start"]
