# One image: the Vue client (static files) served by the Hono server, which also
# carries the API and the background refresh of followed products. Migrations
# are inside the image and run at boot (infra rule BR-DEPLOY-004).
FROM node:24-alpine AS builder
WORKDIR /build

COPY package.json package-lock.json tsconfig.base.json .npmrc ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
ENV NPM_CONFIG_LOGLEVEL=warn
# @Voikyrioh/* (GitHub Packages, private) needs a read:packages token at npm ci.
# GITHUB_TOKEN = build-arg passed by voikyrioh/workflows (repo secret NPM_TOKEN,
# or the workflow token once the package grants this repository read access).
# .npmrc only references ${GITHUB_TOKEN}; this stage is not part of the final image.
ARG GITHUB_TOKEN
RUN npm ci

COPY shared shared
COPY server server
COPY web web
RUN npm run build -w web && npm run build -w server

# Production dependencies of the server workspace only (the bundle keeps them
# external), installed here because @Voikyrioh/observability is private: the
# token stays in this stage, the runtime image only receives node_modules.
# argon2 ships prebuilt musl binaries: no compiler needed on alpine.
FROM node:24-alpine AS deps
WORKDIR /deps
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
ARG GITHUB_TOKEN
RUN npm ci --omit=dev --workspace server --include-workspace-root=false \
	&& rm -rf node_modules/@in-stock

FROM node:24-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/voikyrioh/in_stock
LABEL org.opencontainers.image.description="In Stock: stock and price of computer hardware across online shops (Hono + Vue)"
LABEL org.opencontainers.image.licenses=UNLICENSED

# The infra app sheet (apps/in-stock.yml) sets PUBLIC_ORIGIN and the OTEL_*
# variables; DATABASE_URL comes from Vault.
ENV NODE_ENV=production \
	HOSTNAME=0.0.0.0 \
	PORT=3000 \
	STORAGE=postgres \
	STATIC_DIR=/app/public \
	MIGRATIONS_DIR=/app/migrations

# package.json: "type": "module" for the ESM bundle. No .npmrc, no token here.
COPY package.json ./
COPY --from=deps /deps/node_modules ./node_modules
COPY --from=builder /build/server/dist ./dist
COPY --from=builder /build/web/dist ./public
COPY server/migrations ./migrations

EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# --import register: OpenTelemetry hook + SDK init BEFORE the bundle is linked,
# so that pg and undici are instrumented (traces to SigNoz). OTEL_SERVICE_NAME
# comes from the infra app sheet.
CMD ["node", "--enable-source-maps", "--import", "@Voikyrioh/observability/register", "dist/index.js"]
