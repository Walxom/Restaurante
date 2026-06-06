# ─── Etapa 1: Dependencias ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ─── Etapa 2: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar cliente Prisma y compilar
RUN pnpm db:generate
RUN pnpm build

# ─── Etapa 3: Runner (producción mínima) ──────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copiar solo lo necesario para producción
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Directorio para la base de datos SQLite persistente
RUN mkdir -p /data
ENV DATABASE_URL=file:/data/prod.db

EXPOSE 3001

# El servidor custom maneja Socket.IO + Next.js en producción
CMD ["node", "server.js"]
