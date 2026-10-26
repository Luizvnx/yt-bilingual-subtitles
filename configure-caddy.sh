#!/bin/bash
# ==============================================================================
# Script de Integração com o Caddy (favodemel_caddy) para SSL Automático
# ==============================================================================
set -e

CADDYFILE="/home/ubuntu/apiario-favo-de-mel-site/Caddyfile"
STAGE_DOMAIN="stage.137.131.164.202.sslip.io"
PROD_DOMAIN="137.131.164.202.sslip.io"

echo "🔒 ========================================================"
echo "🔒 INTEGRAÇÃO DE SSL AUTOMÁTICO COM O CADDY"
echo "🔒 ========================================================"

if [ ! -f "$CADDYFILE" ]; then
  echo "❌ Arquivo $CADDYFILE não encontrado."
  echo "Certifique-se de que o projeto Favo de Mel está em /home/ubuntu/apiario-favo-de-mel-site"
  exit 1
fi

# Detecta em qual porta o container de produção do yt_subtitles_app está escutando no host
PROD_PORT="3000"
if docker ps | grep yt_subtitles_app | grep -q "0.0.0.0:80->"; then
  PROD_PORT="80"
elif docker ps | grep yt_subtitles_app | grep -q "0.0.0.0:3000->"; then
  PROD_PORT="3000"
fi

echo "ℹ️ Porta detectada para Produção no Host: $PROD_PORT"
echo "ℹ️ Porta detectada para Staging no Host: 3001"

# Backup do Caddyfile
cp "$CADDYFILE" "${CADDYFILE}.bak_$(date +%Y%m%d_%H%M%S)"
echo "💾 Backup do Caddyfile criado com sucesso."

# Verifica se os domínios já existem no Caddyfile
if grep -q "$PROD_DOMAIN" "$CADDYFILE"; then
  echo "ℹ️ O domínio $PROD_DOMAIN já está presente no Caddyfile. Atualizando configurações..."
  # Remove bloco antigo se existir
  sed -i "/# YT Bilingual Subtitles - Produção/,/# Fim YT Bilingual Subtitles/d" "$CADDYFILE" 2>/dev/null || true
fi

# Adiciona os blocos para Produção e Stage no final do Caddyfile
cat >> "$CADDYFILE" <<EOF

# YT Bilingual Subtitles - Produção
$PROD_DOMAIN {
    reverse_proxy 172.17.0.1:$PROD_PORT {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto https
    }
}

# YT Bilingual Subtitles - Staging
$STAGE_DOMAIN {
    reverse_proxy 172.17.0.1:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto https
    }
}
# Fim YT Bilingual Subtitles
EOF

echo "✅ Configuração gravada em $CADDYFILE com sucesso!"

# Recarrega o Caddy sem derrubar conexões ativas
echo "🔄 Recarregando o container Caddy (sem downtime)..."
if docker ps | grep -q "favodemel_caddy"; then
  docker exec favodemel_caddy caddy reload --config /etc/caddy/Caddyfile
  echo ""
  echo "🎉 ========================================================"
  echo "🎉 HTTPS / SSL ATIVADO COM CADEADO VERDE!"
  echo "🎉 ========================================================"
  echo "👉 Produção: https://$PROD_DOMAIN/"
  echo "👉 Staging:  https://$STAGE_DOMAIN/"
  echo "============================================================"
else
  echo "⚠️ Container favodemel_caddy não encontrado em execução. Reinicie o Caddy para aplicar."
fi
