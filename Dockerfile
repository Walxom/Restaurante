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

# ─── Etapa 3: Runner (producción) ─────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# La app NO usa el server de Next standalone, sino un server.js custom
# (Socket.IO + Next). Por eso copiamos node_modules completo y el build .next:
# así server.js tiene en runtime next, socket.io y serialport (que Next no
# rastrearía en un build standalone porque solo los usa server.js).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package.json ./package.json

# Directorio para la base de datos SQLite persistente
RUN mkdir -p /data
ENV DATABASE_URL=file:/data/prod.db

EXPOSE 3001

# El servidor custom maneja Socket.IO + Next.js en producción
CMD ["node", "server.js"]
