# syntax=docker/dockerfile:1

FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# tini as PID 1 forwards SIGTERM correctly and reaps zombies. Nest's
# enableShutdownHooks() (see src/main.ts) uses that SIGTERM to run
# OnModuleDestroy/BeforeApplicationShutdown hooks, which is what lets the
# in-process BullMQ workers (src/queues) finish/release their current jobs
# instead of being killed mid-task on every deploy.
RUN apk add --no-cache tini

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/database/migrations ./src/database/migrations
COPY --from=build /app/src/database/seeders ./src/database/seeders
COPY --from=build /app/src/database/config/sequelize-cli.config.js ./src/database/config/sequelize-cli.config.js
COPY .sequelizerc ./

# STORAGE_PROVIDER=local (see .env.example) writes uploads under
# ./storage/uploads. Pre-creating it with the runtime user's ownership means
# an empty named volume mounted at /app/storage in docker-compose.yml
# inherits correct permissions on first run instead of ending up root-owned
# and unwritable by the non-root `lumora` user.
RUN addgroup -S lumora && adduser -S lumora -G lumora \
  && mkdir -p storage/uploads && chown -R lumora:lumora storage
USER lumora

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
