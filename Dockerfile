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
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    AUTH_TRUST_HOST=true \
    PORT=3001 \
    DATABASE_URL=file:/data/prod.db

# El código queda a nombre de root (solo lectura para el usuario del contenedor).
# Solo son escribibles /data (base de datos) y .next/cache (caché de Next.js).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js /app/package.json /app/next.config.ts ./
COPY --from=builder /app/scripts/docker ./scripts/docker
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /data .next/cache && chown node:node /data .next/cache

USER node
VOLUME ["/data"]
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/public/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
