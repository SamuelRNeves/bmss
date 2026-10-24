#!/usr/bin/env bash
# =====================================================================
# Configura a VM AMD Micro da Oracle e sobe o BMSS (versão enxuta).
#
# Dentro da VM (ssh -i bmss-oracle.key ubuntu@IP), rode:
#   curl -fsSL https://raw.githubusercontent.com/SamuelRNeves/bmss/migracao-oracle-cloud/deploy/oracle-micro/setup-vm.sh -o setup-vm.sh
#   bash setup-vm.sh
#
# Pode rodar de novo sem problema: cada etapa verifica se já foi feita.
# =====================================================================
set -euo pipefail
BRANCH="${BRANCH:-migracao-oracle-cloud}"
REPO_DIR="$HOME/bmss"

echo "▶ 1/6 Swap de 2 GB (folga para a VM de 1 GB)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf >/dev/null
  sudo sysctl -q --system
fi
free -h | sed -n '1,3p'

echo "▶ 2/6 Firewall interno: liberando portas 80 e 443"
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$p" -m state --state NEW -j ACCEPT 2>/dev/null \
    || sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$p" -j ACCEPT
done
sudo netfilter-persistent save >/dev/null 2>&1 || true

echo "▶ 3/6 Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh >/dev/null
fi
sudo usermod -aG docker "$USER"
DOCKER="sudo docker"

echo "▶ 4/6 Código do BMSS"
if [[ -d "$REPO_DIR/.git" ]]; then
  git -C "$REPO_DIR" fetch -q origin "$BRANCH" && git -C "$REPO_DIR" checkout -q "$BRANCH" && git -C "$REPO_DIR" pull -q
else
  git clone -q -b "$BRANCH" https://github.com/SamuelRNeves/bmss.git "$REPO_DIR"
fi
cd "$REPO_DIR/deploy/oracle-micro"

echo "▶ 5/6 Configuração (.env)"
if [[ ! -f .env ]]; then
  IP="$(curl -fsS https://api.ipify.org || curl -fsS https://ifconfig.me)"
  DOMAIN="${IP//./-}.sslip.io"
  echo "  Domínio da API: $DOMAIN"
  echo "  (o que você digitar nas perguntas abaixo não aparece na tela)"
  read -r -s -p "  Chave NOVA da NewsAPI: " NEWSAPI; echo
  read -r -s -p "  Chave do Resend (Enter para pular): " RESEND; echo
  read -r -p    "  Cloudinary cloud name (Enter para pular): " CLD_NAME
  read -r -p    "  Cloudinary API key (Enter para pular): " CLD_KEY
  read -r -s -p "  Cloudinary API secret (Enter para pular): " CLD_SECRET; echo
  umask 077
  cat > .env <<EOF
DOMAIN=${DOMAIN}
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
NEWSAPI_API_KEY=${NEWSAPI}
RESEND_API_KEY=${RESEND}
RESEND_FROM_EMAIL=BMSS Alerts <onboarding@resend.dev>
CLOUDINARY_CLOUD_NAME=${CLD_NAME}
CLOUDINARY_API_KEY=${CLD_KEY}
CLOUDINARY_API_SECRET=${CLD_SECRET}
EOF
  echo "  ✓ .env criado (senha do banco e segredo JWT gerados automaticamente)"
else
  echo "  ✓ .env já existe (mantido)"
fi
DOMAIN="$(grep '^DOMAIN=' .env | cut -d= -f2)"

echo "▶ 6/6 Subindo os contêineres (o Spring Boot leva 1-3 min para iniciar)"
$DOCKER compose pull -q
$DOCKER compose up -d

echo -n "  Aguardando a API responder"
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null --max-time 5 "https://${DOMAIN}/"; then echo; break; fi
  echo -n "."; sleep 5
done
echo
$DOCKER compose ps
echo
echo "✅ Pronto! API em: https://${DOMAIN}"
echo "   No Vercel: NEXT_PUBLIC_API_BASE_URL=https://${DOMAIN}/api/v1  → Redeploy"
