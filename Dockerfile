# ==============================================================================
# SIGER-IA — Aplicación web (Next.js + Socket.IO + Prisma/SQLite)
# Imagen Linux: corre igual en Linux (Docker Engine) y en Windows/macOS (Docker Desktop).
# ==============================================================================

# ─── Etapa 1: Dependencias ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
# openssl: motor de Prisma · python3/make/g++: compilar serialport si no hay binario precompilado
RUN apk add --no-cache openssl python3 make g++ \
 && corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ─── Etapa 2: Compilación ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm db:generate && pnpm build

# ─── Etapa 3: Ejecución (producción) ──────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl wget
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    DATABASE_URL=file:/data/prod.db

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/server.js /app/package.json /app/next.config.ts ./
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

# /data guarda la base SQLite en un volumen persistente
RUN mkdir -p /data && chown node:node /data && chmod +x ./docker-entrypoint.sh

USER node
VOLUME ["/data"]
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/public/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
