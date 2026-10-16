# Multi-stage Dockerfile otimizado para Next.js Standalone
# Suporte nativo a arquiteturas x86_64 e ARM64 (Oracle Cloud Ampere A1)

# Estágio 1: Dependências
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Estágio 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera o Prisma Client com os modelos relacionais
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Estágio 3: Runner de Produção
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Instala ferramentas essenciais para legendas e áudio: python3, ffmpeg e yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    ca-certificates && \
    python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip yt-dlp youtube-transcript-api && \
    chmod -R 755 /opt/venv && \
    ln -sf /opt/venv/bin/youtube_transcript_api /usr/local/bin/youtube_transcript_api && \
    ln -sf /opt/venv/bin/yt-dlp /usr/local/bin/yt-dlp && \
    ln -sf /opt/venv/bin/python3 /usr/local/bin/python3 && \
    ln -sf /opt/venv/bin/python /usr/local/bin/python

ENV PATH="/opt/venv/bin:$PATH"

# Cria usuário não-root por segurança com home próprio
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 -h /home/nextjs nextjs && \
    mkdir -p /home/nextjs/.cache && \
    chown -R nextjs:nodejs /home/nextjs

ENV HOME=/home/nextjs

# Copia arquivos estáticos e standalone do build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data && chmod 777 /app/data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
