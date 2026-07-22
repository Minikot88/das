FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY test/auth-rbac.postgres.integration.ts ./test/auth-rbac.postgres.integration.ts
COPY vitest.integration.config.ts ./vitest.integration.config.ts
ENV DATABASE_URL=postgresql://dashboard_app:dashboard@postgres:5432/dashboard_mini_bi
RUN npm run prisma:generate && npm run lint && npm run typecheck && npm test -- --run && npm run build

FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM builder AS migration
USER node

FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node --from=builder /app/package.json /app/package-lock.json ./
COPY --chown=node:node --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/src/infrastructure/database/generated/prisma ./src/infrastructure/database/generated/prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN mkdir -p /data/uploads /data/exports && chown -R node:node /data \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
