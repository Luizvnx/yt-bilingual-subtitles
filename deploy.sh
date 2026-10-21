#!/bin/bash
# ========================================================
# Script de Deploy Automático para a VPS (137.131.164.202)
# ========================================================

set -e

echo "🚀 Iniciando Deploy do YT Bilingual Subtitles..."

# 1. Detecta comando docker (com ou sem sudo, v1 ou v2)
if docker info >/dev/null 2>&1; then
  DC="docker compose"
  if ! docker compose version >/dev/null 2>&1; then DC="docker-compose"; fi
elif sudo docker info >/dev/null 2>&1; then
  DC="sudo docker compose"
  if ! sudo docker compose version >/dev/null 2>&1; then DC="sudo docker-compose"; fi
else
  DC="docker compose"
fi

echo "🐳 Usando gerenciador: $DC"

# 2. Puxa as alterações mais recentes do GitHub
echo "📥 Atualizando código com 'git fetch' e 'git reset'..."
git fetch origin main
git reset --hard origin/main

# 3. Garante diretórios essenciais no host
mkdir -p data

# 4. Se o .env não existir na VPS, copia o .env.example
if [ ! -f .env ]; then
  echo "📄 Criando arquivo .env a partir de .env.example..."
  cp .env.example .env
  echo "⚠️ Por favor, preencha as variáveis de produção no arquivo .env"
else
  echo "✅ Arquivo .env já existe no servidor."
fi

# 5. Baixa e recompila os containers (Postgres + Cloudflare WARP + Next.js)
echo "🐳 Baixando e reconstruindo containers com proxy WARP automático..."
$DC down
$DC pull warp || true
$DC build --no-cache app
$DC up -d

# 6. Checagem de status
echo "⏳ Aguardando inicialização dos serviços..."
sleep 6

$DC ps

echo "🎉 Deploy concluído com sucesso! Aplicação ativa em http://137.131.164.202"
