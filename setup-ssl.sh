#!/bin/bash
# ==============================================================================
# Script de Configuração Automatizada de SSL / HTTPS com Nginx e Certbot
# Hostname Gratuito: sslip.io (Zero Custo, Let's Encrypt Oficial, Cadeado Verde)
# ==============================================================================
# Este script:
#   1. Libera portas 80 e 443 no firewall do Ubuntu.
#   2. Instala Nginx e Certbot (caso não estejam instalados).
#   3. Cria a configuração de Reverse Proxy para Produção (:3000) e Stage (:3001)
#      com suporte otimizado a Server-Sent Events (SSE / streaming em tempo real).
#   4. Emite certificados SSL gratuitos com renovação automática pelo Let's Encrypt:
#      - Stage:     https://stage.137.131.164.202.sslip.io
#      - Produção:  https://137.131.164.202.sslip.io
# ==============================================================================

set -e

VPS_IP="${HOST_IP:-$(curl -s -m 2 https://api.ipify.org 2>/dev/null || curl -s -m 2 https://ifconfig.me 2>/dev/null || echo "")}"
STAGE_DOMAIN="${STAGE_DOMAIN:-stage.${VPS_IP}.sslip.io}"
PROD_DOMAIN="${PROD_DOMAIN:-${VPS_IP}.sslip.io}"

echo "🔒 ========================================================"
echo "🔒 CONFIGURAÇÃO DE HTTPS / SSL COM CADEADO VERDE (SSLIP.IO)"
echo "🔒 ========================================================"

# 1. Verifica privilégios de sudo
if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
  echo "🔑 Solicitando privilégios de superusuário (sudo)..."
fi
SUDO="sudo"
if [ "$EUID" -eq 0 ]; then SUDO=""; fi

# 2. Libera portas 80 e 443 no firewall local do Ubuntu (iptables + ufw)
echo "🛡️ Liberando portas 80 e 443 no firewall local..."
$SUDO iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
$SUDO iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
if command -v netfilter-persistent >/dev/null 2>&1; then
  $SUDO netfilter-persistent save 2>/dev/null || true
fi
if command -v ufw >/dev/null 2>&1; then
  $SUDO ufw allow 80/tcp 2>/dev/null || true
  $SUDO ufw allow 443/tcp 2>/dev/null || true
fi

# 3. Instala Nginx e Certbot se não estiverem presentes
echo "📦 Verificando pacotes do Nginx e Certbot..."
$SUDO apt-get update -y
$SUDO apt-get install -y nginx certbot python3-certbot-nginx

# 4. Cria arquivo de configuração do Nginx com suporte a SSE (proxy_buffering off)
NGINX_CONF="/etc/nginx/sites-available/yt-bilingual-subtitles.conf"
echo "⚙️ Configurando Nginx Reverse Proxy em $NGINX_CONF..."

$SUDO bash -c "cat > $NGINX_CONF" <<EOF
# 1. Stage Environment (Porta 3001)
server {
    listen 80;
    server_name $STAGE_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Suporte essencial a Server-Sent Events (SSE) sem buffering
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}

# 2. Produção Environment (Porta 3000)
server {
    listen 80;
    server_name $PROD_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Suporte essencial a Server-Sent Events (SSE) sem buffering
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

# 5. Ativa a configuração no Nginx e valida sintaxe
echo "🔗 Ativando configuração no Nginx..."
$SUDO rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
$SUDO ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
$SUDO nginx -t

# Desativa Apache caso tenha sido instalado como dependência e esteja segurando a porta 80
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet apache2 2>/dev/null; then
    echo "⚠️ Apache2 detectado rodando na porta 80. Desativando Apache2 em favor do Nginx..."
    $SUDO systemctl stop apache2 2>/dev/null || true
    $SUDO systemctl disable apache2 2>/dev/null || true
  fi
fi

if ! $SUDO systemctl restart nginx 2>/dev/null; then
  echo "⚠️ Falha ao reiniciar Nginx via systemctl. Verificando conflito na porta 80..."
  OCCUPIER=$($SUDO ss -tulpn | grep -E ':80\s' || true)
  if [ -n "$OCCUPIER" ]; then
    echo "❌ A porta 80 já está ocupada pelo seguinte processo:"
    echo "$OCCUPIER"
  fi
  echo "Tentando liberar processos antigos e reiniciar..."
  $SUDO systemctl start nginx || {
    echo "❌ O Nginx não pôde iniciar porque a porta 80 está em uso por outro serviço."
    exit 1
  }
fi

# 6. Emite os Certificados SSL Oficiais com o Certbot (Let's Encrypt)
echo "📜 Solicitando Certificados SSL ao Let's Encrypt para $STAGE_DOMAIN e $PROD_DOMAIN..."
EMAIL_ARG="--register-unsafely-without-email"
if [ -n "$1" ] && [[ "$1" == *"@"* ]]; then
  EMAIL_ARG="-m $1"
fi

$SUDO certbot --nginx --agree-tos $EMAIL_ARG --redirect --non-interactive \
  -d "$PROD_DOMAIN" \
  -d "$STAGE_DOMAIN" || {
    echo "⚠️ Aviso: Tentativa conjunta falhou. Emitindo certificado individual para Produção ($PROD_DOMAIN)..."
    $SUDO certbot --nginx --agree-tos $EMAIL_ARG --redirect --non-interactive -d "$PROD_DOMAIN" || true
    echo "Tentando emissão individual para Stage ($STAGE_DOMAIN)..."
    $SUDO certbot --nginx --agree-tos $EMAIL_ARG --redirect --non-interactive -d "$STAGE_DOMAIN" || true
}

# 7. Atualiza variáveis de URL nos arquivos .env
echo "📝 Atualizando NEXT_PUBLIC_BASE_URL nos arquivos de configuração..."
if [ -f .env.stage ]; then
  sed -i "s|^NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=https://$STAGE_DOMAIN|" .env.stage
  sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$STAGE_DOMAIN|" .env.stage
  echo "✅ .env.stage atualizado para https://$STAGE_DOMAIN"
fi

if [ -f .env ]; then
  sed -i "s|^NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=https://$PROD_DOMAIN|" .env
  sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$PROD_DOMAIN|" .env
  echo "✅ .env atualizado para https://$PROD_DOMAIN"
fi

echo ""
echo "============================================================"
echo "🎉 CONFIGURAÇÃO DE HTTPS CONCLUÍDA COM SUCESSO!"
echo "============================================================"
echo ""
echo "🌐 Acesse com HTTPS & Cadeado Verde Oficial:"
echo "   🧪 Stage:    👉 https://$STAGE_DOMAIN"
echo "   🚀 Produção: 👉 https://$PROD_DOMAIN"
echo ""
echo "📌 ATENÇÃO (Painel Oracle Cloud):"
echo "   Lembre-se de garantir que as portas 80 e 443 estejam liberadas"
echo "   nas Ingress Rules da Security List da sua VCN no console da Oracle!"
echo "============================================================"
