#!/bin/bash
# ========================================================
# Script de Deploy Automático para a VPS (137.131.164.202)
# ========================================================

set -e

echo "🚀 Iniciando Deploy do YT Bilingual Subtitles..."

# 1. Puxa as alterações mais recentes do GitHub
echo "📥 Atualizando código com 'git fetch' e 'git reset'..."
git fetch origin main
git reset --hard origin/main

# 2. Garante diretórios essenciais no host
mkdir -p data

# 3. Se o .env não existir na VPS, copia o .env.example
if [ ! -f .env ]; then
  echo "📄 Criando arquivo .env a partir de .env.example..."
  cp .env.example .env
  echo "⚠️ Por favor, preencha as variáveis de produção no arquivo .env"
else
  echo "✅ Arquivo .env já existe no servidor."
fi

# 4. Baixa e recompila os containers (Postgres + Cloudflare WARP + Next.js)
echo "🐳 Baixando e reconstruindo containers com proxy WARP automático..."
docker compose down
docker compose pull warp || true
docker compose build --no-cache app
docker compose up -d

# 5. Checagem de status
echo "⏳ Aguardando inicialização dos serviços..."
sleep 6

docker compose ps

echo "🎉 Deploy concluído com sucesso! Aplicação ativa em http://137.131.164.202"
