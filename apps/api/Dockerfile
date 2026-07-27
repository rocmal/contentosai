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
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/database/migrations ./src/database/migrations
COPY --from=build /app/src/database/seeders ./src/database/seeders
COPY --from=build /app/src/database/config/sequelize-cli.config.js ./src/database/config/sequelize-cli.config.js
COPY .sequelizerc ./

RUN addgroup -S lumora && adduser -S lumora -G lumora
USER lumora

EXPOSE 3000

CMD ["node", "dist/main"]
