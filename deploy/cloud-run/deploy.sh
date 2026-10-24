#!/usr/bin/env bash
# =====================================================================
# Deploy do back-end do BMSS no Google Cloud Run (camada gratuita)
#
# Rode no Cloud Shell (console.cloud.google.com → ícone ">_"):
#   git clone -b migracao-oracle-cloud https://github.com/SamuelRNeves/bmss.git
#   bash bmss/deploy/cloud-run/deploy.sh
#
# O script:
#   1. ativa as APIs necessárias;
#   2. cria um repositório "remoto" no Artifact Registry que espelha o
#      GitHub Container Registry (ghcr.io) — a imagem é compilada pelo
#      GitHub Actions e o Cloud Run só a baixa;
#   3. guarda as senhas no Secret Manager (você digita, nada é exibido);
#   4. publica o serviço com no máximo 1 instância (evita custos).
#
# Pode rodar de novo quando quiser: ele atualiza o que já existe.
# =====================================================================
set -euo pipefail

PROJECT_ID="$(gcloud config get-value project 2>/dev/null)"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "❌ Nenhum projeto selecionado. Rode: gcloud config set project SEU_PROJETO"
  exit 1
fi

REGION="${REGION:-us-west1}"          # Oregon: perto do Supabase (us-west-2) e na faixa grátis
SERVICE="${SERVICE:-bmss-backend}"
AR_REPO="${AR_REPO:-ghcr}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/samuelrneves/bmss-backend:latest"

# Dados do banco (Supabase → Connect → Session pooler). Não são segredos.
DB_HOST="${DB_HOST:-aws-1-us-west-2.pooler.supabase.com}"
DB_USER="${DB_USER:-postgres.ojbcxxxlpngjzwwjjqis}"
DATABASE_URL="jdbc:postgresql://${DB_HOST}:5432/postgres?sslmode=require"

echo "▶ Projeto: ${PROJECT_ID} | Região: ${REGION} | Serviço: ${SERVICE}"

# ---------------------------------------------------------------------
# 1. APIs
# ---------------------------------------------------------------------
echo "▶ Ativando APIs (pode levar 1-2 minutos)..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

# ---------------------------------------------------------------------
# 2. Repositório remoto apontando para o ghcr.io
# ---------------------------------------------------------------------
if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" >/dev/null 2>&1; then
  echo "▶ Criando repositório remoto do ghcr.io no Artifact Registry..."
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --mode=remote-repository \
    --remote-repo-config-desc="GitHub Container Registry" \
    --remote-docker-repo="https://ghcr.io"
else
  echo "▶ Repositório ${AR_REPO} já existe."
fi

# ---------------------------------------------------------------------
# 3. Segredos (Secret Manager)
# ---------------------------------------------------------------------
put_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "${name}" >/dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets versions add "${name}" --data-file=- >/dev/null
  else
    printf '%s' "${value}" | gcloud secrets create "${name}" --replication-policy=automatic --data-file=- >/dev/null
  fi
  echo "  ✓ ${name}"
}

ask_secret() {
  # ask_secret NOME "pergunta" [opcional]
  local name="$1" prompt="$2" optional="${3:-}"
  if gcloud secrets describe "${name}" >/dev/null 2>&1; then
    read -r -p "  ${name} já existe. Trocar? [s/N] " change
    [[ "${change,,}" == "s" ]] || { echo "  ✓ ${name} (mantido)"; return; }
  fi
  local value=""
  read -r -s -p "  ${prompt}: " value; echo
  if [[ -z "${value}" ]]; then
    if [[ -n "${optional}" ]]; then value="nao-configurado"; else echo "  ❌ ${name} é obrigatório"; exit 1; fi
  fi
  put_secret "${name}" "${value}"
}

echo "▶ Segredos (o que você digitar não aparece na tela):"
ask_secret bmss-db-password   "Senha do banco do Supabase"
if ! gcloud secrets describe bmss-jwt-secret >/dev/null 2>&1; then
  put_secret bmss-jwt-secret "$(openssl rand -base64 64 | tr -d '\n')"   # gerado automaticamente
else
  echo "  ✓ bmss-jwt-secret (mantido)"
fi
ask_secret bmss-newsapi-key   "Chave NOVA da NewsAPI"
ask_secret bmss-resend-key    "Chave do Resend (Enter para pular)" optional
ask_secret bmss-cloudinary-secret "API secret do Cloudinary (Enter para pular)" optional

read -r -p "▶ Cloudinary cloud name (Enter para pular): " CLOUDINARY_CLOUD_NAME
read -r -p "▶ Cloudinary API key (Enter para pular): " CLOUDINARY_API_KEY

# Conta de serviço padrão do Cloud Run precisa ler os segredos
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
for s in bmss-db-password bmss-jwt-secret bmss-newsapi-key bmss-resend-key bmss-cloudinary-secret; do
  gcloud secrets add-iam-policy-binding "${s}" \
    --member="serviceAccount:${RUN_SA}" --role="roles/secretmanager.secretAccessor" >/dev/null
done

# ---------------------------------------------------------------------
# 4. Deploy
# ---------------------------------------------------------------------
echo "▶ Publicando no Cloud Run..."
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=1Gi \
  --min-instances=0 \
  --max-instances=1 \
  --concurrency=40 \
  --cpu-boost \
  --timeout=120 \
  --set-env-vars="^@^SPRING_PROFILES_ACTIVE=prod@TZ=America/Sao_Paulo@BMSS_SENTIMENT_MODE=local@DATABASE_URL=${DATABASE_URL}@DATABASE_USER=${DB_USER}@RESEND_FROM_EMAIL=BMSS Alerts <onboarding@resend.dev>@CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME:-}@CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY:-}@JAVA_TOOL_OPTIONS=-Xms128m -Xmx512m -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC -XX:TieredStopAtLevel=1" \
  --set-secrets="DATABASE_PASSWORD=bmss-db-password:latest,JWT_SECRET=bmss-jwt-secret:latest,NEWSAPI_API_KEY=bmss-newsapi-key:latest,RESEND_API_KEY=bmss-resend-key:latest,CLOUDINARY_API_SECRET=bmss-cloudinary-secret:latest"

URL="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --format='value(status.url)')"
echo
echo "✅ Pronto! Back-end no ar em: ${URL}"
echo "   No Vercel, defina NEXT_PUBLIC_API_BASE_URL=${URL}/api/v1 e faça Redeploy."
