# syntax=docker/dockerfile:1
#
# Production image for the root web app: Express server (server.ts) serving
# the built Vite SPA plus the legacy /api/* AI-Studio routes (Gemini calls).
# This is NOT the NestJS backend - that lives in apps/api and has its own
# Dockerfile. See docker-compose.yml at the repo root for how the two are
# composed together in production.

FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Vite inlines import.meta.env.VITE_* into the compiled JS bundle at build
# time - it is NOT readable at container runtime like a normal env var. The
# frontend (src/lib/api.ts) uses VITE_API_URL to build every API request
# URL, so it must be supplied here as a build arg. Deployed behind the
# path-based reverse proxy (see docker-compose.yml + docker/apache), this
# must be the public site origin (https://lumoraos.in), not a container
# hostname/port - the browser calls it directly, then Apache routes
# /api/v1/* of that same origin to the API container.
ARG VITE_API_URL=https://lumoraos.in
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# tini as PID 1 forwards SIGTERM correctly and reaps zombie processes -
# without it `docker stop` / `docker compose up -d --no-deps` has to wait
# out the full stop-grace-period timeout instead of exiting immediately,
# which directly hurts the "minimal downtime restart" deploy requirement.
RUN apk add --no-cache tini

# vite is a runtime dependency here, not just a build tool: server.ts
# statically imports createServer from 'vite' at module load time, and
# esbuild's --packages=external (see package.json "build" script) keeps
# that import unbundled, so dist/server.cjs does `require('vite')`
# unconditionally even though the vite dev-server branch never runs in
# production. It's intentionally listed in "dependencies", not just
# "devDependencies" - do not remove it from there.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN addgroup -S lumora && adduser -S lumora -G lumora
USER lumora

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.cjs"]
