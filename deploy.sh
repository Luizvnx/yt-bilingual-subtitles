#!/bin/bash
# ========================================================
# Script de Deploy Automático para a VPS (137.131.164.202)
# ========================================================

set -e

echo "🚀 Iniciando Deploy do YT Bilingual Subtitles..."

# 1. Puxa as alterações mais recentes do GitHub (sincronização garantida sem travas)
echo "📥 Atualizando código com 'git fetch' e 'git reset'..."
git fetch origin main
git reset --hard origin/main

# 2. Garante diretório data
mkdir -p data

# 3. Se o .env não existir na VPS, copia o .env.example
if [ ! -f .env ]; then
  echo "📄 Criando arquivo .env a partir de .env.example..."
  cp .env.example .env
  echo "⚠️ Por favor, preencha as variáveis de produção no arquivo .env"
else
  echo "✅ Arquivo .env já existe no servidor."
fi

# 4. Configuração automática do Cloudflare WARP (se instalado no host)
if command -v warp-cli >/dev/null 2>&1; then
  echo "🛡️ Cloudflare WARP detectado. Ativando modo Proxy SOCKS5 (porta 40000)..."
  warp-cli --accept-tos mode proxy 2>/dev/null || true
  warp-cli --accept-tos proxy port 40000 2>/dev/null || true
  warp-cli --accept-tos connect 2>/dev/null || true
fi

# 3. Reinicia e recompila os containers
echo "🐳 Reconstruindo container da aplicação Next.js..."
docker compose down
docker compose build --no-cache app
docker compose up -d

# 4. Checagem de status
echo "⏳ Aguardando inicialização dos serviços..."
sleep 5

docker compose ps

echo "🎉 Deploy concluído com sucesso! Aplicação ativa em http://137.131.164.202"
