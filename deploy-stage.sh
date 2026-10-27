#!/bin/bash
# ==============================================================================
# Script de Deploy e Gerenciamento do Ambiente STAGE (Testes)
# Porta 3001 / Postgres 5434
# ==============================================================================
# Uso:
#   ./deploy-stage.sh               -> Atualiza e sobe o Stage na branch 'stage' (ou 'main')
#   ./deploy-stage.sh <branch>      -> Faz checkout e deploy de uma branch específica
#   ./deploy-stage.sh logs          -> Exibe os logs em tempo real do Stage
#   ./deploy-stage.sh ps            -> Mostra status dos containers do Stage
#   ./deploy-stage.sh stop          -> Para os containers do Stage (libera memória)
#   ./deploy-stage.sh restart       -> Reinicia os containers do Stage
# ==============================================================================

set -e

COMPOSE_FILE="docker-compose.stage.yml"
ENV_FILE=".env.stage"
ENV_EXAMPLE=".env.stage.example"

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

COMMAND_PREFIX="$DC --env-file $ENV_FILE -f $COMPOSE_FILE"

# 2. Tratamento de subcomandos utilitários
ACTION="${1:-deploy}"

if [ "$ACTION" = "logs" ]; then
  echo "📋 Visualizando logs do ambiente STAGE..."
  $COMMAND_PREFIX logs -f app_stage
  exit 0
fi

if [ "$ACTION" = "ps" ] || [ "$ACTION" = "status" ]; then
  echo "🔍 Status dos containers de STAGE:"
  $COMMAND_PREFIX ps
  exit 0
fi

if [ "$ACTION" = "stop" ] || [ "$ACTION" = "down" ]; then
  echo "🛑 Parando ambiente STAGE..."
  $COMMAND_PREFIX down
  echo "✅ Ambiente STAGE desativado com sucesso (Produção segue intacta)."
  exit 0
fi

if [ "$ACTION" = "restart" ]; then
  echo "🔄 Reiniciando containers de STAGE..."
  $COMMAND_PREFIX restart
  $COMMAND_PREFIX ps
  exit 0
fi

# ==============================================================================
# FLUXO DE DEPLOY COMPLETO
# ==============================================================================
echo "🧪 ========================================================"
echo "🧪 INICIANDO DEPLOY DO AMBIENTE STAGE (TESTES & HOMOLOGAÇÃO)"
echo "🧪 ========================================================"
echo "🐳 Gerenciador Docker detectado: $DC"

# 3. Garante diretórios essenciais
mkdir -p data

# 4. Configuração do arquivo .env.stage
if [ ! -f "$ENV_FILE" ]; then
  echo "📄 Arquivo $ENV_FILE não encontrado. Criando a partir de $ENV_EXAMPLE..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"

  # Se houver .env de produção, importa chaves de IA/YouTube se vazias no stage
  if [ -f .env ]; then
    echo "🔑 Importando chaves de API existentes do .env principal para facilitar testes..."
    for key in GROQ_API_KEY OPENAI_API_KEY YOUTUBE_API_KEY; do
      val=$(grep "^$key=" .env 2>/dev/null | cut -d'=' -f2- || true)
      if [ -n "$val" ]; then
        sed -i "s|^$key=.*|$key=$val|" "$ENV_FILE"
      fi
    done
  fi
  echo "✅ Arquivo $ENV_FILE inicializado com isolamento total (Porta 3001, DB 5434)."
else
  echo "✅ Arquivo $ENV_FILE localizado."
fi

# 5. Atualização de Código do Git (Branch)
TARGET_BRANCH="${1:-}"

if [ -n "$TARGET_BRANCH" ] && [ "$TARGET_BRANCH" != "deploy" ]; then
  echo "🌿 Alternando e atualizando para a branch informada: '$TARGET_BRANCH'..."
  git fetch origin "$TARGET_BRANCH"
  git checkout "$TARGET_BRANCH"
  git reset --hard "origin/$TARGET_BRANCH"
else
  # Se existir branch 'stage' remota, usa ela; caso contrário, atualiza a branch atual
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
  echo "📥 Buscando atualizações remotas na branch '$CURRENT_BRANCH'..."
  git fetch origin "$CURRENT_BRANCH" || git fetch origin main
  git reset --hard "origin/$CURRENT_BRANCH" 2>/dev/null || git reset --hard origin/main
fi

# 6. Baixa imagens base e reconstrói containers de Stage
echo "🐳 Preparando containers de STAGE (Postgres Stage + WARP Stage + App Stage)..."
$COMMAND_PREFIX down --remove-orphans || true
$COMMAND_PREFIX pull warp_stage || true

echo "🔨 Compilando imagem do Next.js para STAGE (--no-cache)..."
$COMMAND_PREFIX build --no-cache app_stage

echo "🚀 Subindo serviços de STAGE em segundo plano..."
$COMMAND_PREFIX up -d

# 7. Aguarda inicialização e checa saúde dos serviços
echo "⏳ Aguardando serviços ficarem online (10s)..."
sleep 10

# Garante a criação de tabelas no banco de Stage se necessário
if [ -f "frontend/prisma/init.sql" ]; then
  echo "🗄️ Verificando e aplicando tabelas no banco de dados de Stage..."
  $COMMAND_PREFIX exec -T postgres_stage psql -U postgres_stage -d yt_bilingual_subtitles_stage -f /docker-entrypoint-initdb.d/init.sql >/dev/null 2>&1 || true
fi

# 8. Relatório final de execução
echo ""
echo "============================================================"
echo "🎉 DEPLOY DE STAGE CONCLUÍDO COM SUCESSO!"
echo "============================================================"
$COMMAND_PREFIX ps
echo ""
echo "🌐 Acesse o Ambiente de Testes:"
echo "   👉 Porta :3001 (ex: http://SEU_IP:3001)"
echo ""
echo "🛡️ Produção continua ativa em:"
echo "   👉 Porta :3000 (ou porta configurada)"
echo ""
echo "💡 Comandos Úteis do Ambiente de Testes:"
echo "   - Ver logs:         ./deploy-stage.sh logs"
echo "   - Ver status:       ./deploy-stage.sh ps"
echo "   - Pausar stage:     ./deploy-stage.sh stop"
echo "   - Reiniciar stage:  ./deploy-stage.sh restart"
echo "============================================================"
