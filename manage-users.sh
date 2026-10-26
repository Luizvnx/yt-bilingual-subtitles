#!/bin/bash
# ==============================================================================
# Script de Gerenciamento de Contas e Administradores (VPS / Local)
# ==============================================================================
# Uso:
#   ./manage-users.sh list
#   ./manage-users.sh create-admin "Seu Nome" admin@exemplo.com "senhaForte123"
#   ./manage-users.sh promote usuario@exemplo.com
#   ./manage-users.sh set-tier usuario@exemplo.com pro
#   ./manage-users.sh reset-password usuario@exemplo.com "novaSenha123"
#   ./manage-users.sh delete usuario@exemplo.com
# ==============================================================================

set -e

# 1. Detecta comando docker
DOCKER_CMD="docker"
if docker info >/dev/null 2>&1; then
  DC="docker compose"
  if ! docker compose version >/dev/null 2>&1; then DC="docker-compose"; fi
  DOCKER_CMD="docker"
elif sudo docker info >/dev/null 2>&1; then
  DC="sudo docker compose"
  if ! sudo docker compose version >/dev/null 2>&1; then DC="sudo docker-compose"; fi
  DOCKER_CMD="sudo docker"
else
  DC="docker compose"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 2. Se o container 'app' de produção estiver rodando, executa dentro do container
if $DC ps --services --filter "status=running" 2>/dev/null | grep -q "^app$"; then
  # Sincroniza scripts recentes diretamente no container para evitar necessidade de rebuild imediato
  if [ -f "frontend/scripts/manage_users.js" ]; then
    $DOCKER_CMD cp frontend/scripts/manage_users.js yt_subtitles_app:/app/scripts/manage_users.js >/dev/null 2>&1 || true
    $DOCKER_CMD cp frontend/scripts/bcrypt.js yt_subtitles_app:/app/scripts/bcrypt.js >/dev/null 2>&1 || true
  fi
  $DC exec app node scripts/manage_users.js "$@"
  exit $?
fi

# 3. Se o container 'app_stage' de staging estiver rodando, executa no stage
if $DC -f docker-compose.stage.yml ps --services --filter "status=running" 2>/dev/null | grep -q "^app_stage$"; then
  if [ -f "frontend/scripts/manage_users.js" ]; then
    $DOCKER_CMD cp frontend/scripts/manage_users.js yt_subtitles_app_stage:/app/scripts/manage_users.js >/dev/null 2>&1 || true
    $DOCKER_CMD cp frontend/scripts/bcrypt.js yt_subtitles_app_stage:/app/scripts/bcrypt.js >/dev/null 2>&1 || true
  fi
  $DC -f docker-compose.stage.yml exec app_stage node scripts/manage_users.js "$@"
  exit $?
fi

# 4. Fallback: Se Node estiver no host
if command -v node >/dev/null 2>&1; then
  if [ -d "frontend" ]; then
    (cd frontend && node scripts/manage_users.js "$@")
  else
    node scripts/manage_users.js "$@"
  fi
  exit $?
fi

echo "❌ Não foi possível executar o gerenciador de usuários."
echo "Certifique-se de que o container Docker da aplicação está rodando (bash deploy.sh) ou de ter o Node.js instalado no host."
exit 1
