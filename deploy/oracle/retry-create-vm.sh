#!/usr/bin/env bash
# =====================================================================
# Tenta criar a VM Always Free "bmss" na Oracle Cloud até conseguir.
#
# Ordem de tentativa (a cada rodada):
#   1. Arm  VM.Standard.A1.Flex  2 OCPU / 12 GB
#   2. Arm  VM.Standard.A1.Flex  1 OCPU /  6 GB
#   3. AMD  VM.Standard.E2.1.Micro (1 GB)
#
# Para quando a VM existir (ou quando o tempo limite acabar).
# Usa a OCI CLI já autenticada (~/.oci/config). Feito para rodar no
# GitHub Actions (.github/workflows/oracle-retry.yml), mas funciona
# em qualquer máquina com a OCI CLI configurada.
# =====================================================================
set -uo pipefail

NAME="${VM_NAME:-bmss}"
SUBNET_NAME="${SUBNET_NAME:-public subnet-bmss-vcn}"
SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY:-ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJHKq2nb+M43GawKEt5bVnLTJePfelBR27GwsCRP01qb bmss-oracle}"
INTERVAL="${INTERVAL:-90}"                 # segundos entre rodadas
DEADLINE=$(( $(date +%s) + ${MAX_MINUTES:-340} * 60 ))

COMP="${OCI_TENANCY:?defina OCI_TENANCY (OCID da tenancy)}"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

existing_vm() {
  oci compute instance list --compartment-id "$COMP" --display-name "$NAME" --all \
    --query "data[?\"lifecycle-state\"!='TERMINATED' && \"lifecycle-state\"!='TERMINATING'] | [0].id" \
    --raw-output 2>/dev/null | grep -v '^null$' || true
}

latest_ubuntu() { # $1 = shape
  oci compute image list --compartment-id "$COMP" \
    --operating-system "Canonical Ubuntu" --operating-system-version "24.04" \
    --shape "$1" --sort-by TIMECREATED --sort-order DESC --all \
    --query "data[?!contains(\"display-name\", 'Minimal')] | [0].id" --raw-output
}

log "Descobrindo recursos..."
AD="$(oci iam availability-domain list --compartment-id "$COMP" --query 'data[0].name' --raw-output)"
SUBNET="$(oci network subnet list --compartment-id "$COMP" --all \
  --query "data[?\"display-name\"=='${SUBNET_NAME}'] | [0].id" --raw-output)"
IMG_ARM="$(latest_ubuntu VM.Standard.A1.Flex)"
IMG_X86="$(latest_ubuntu VM.Standard.E2.1.Micro)"
log "AD=$AD"
log "Sub-rede=$SUBNET"
log "Imagem Arm=$IMG_ARM"
log "Imagem x86=$IMG_X86"

if [[ -z "$SUBNET" || "$SUBNET" == "null" ]]; then
  log "❌ Sub-rede '${SUBNET_NAME}' não encontrada."; exit 1
fi

KEYFILE="$(mktemp)"; echo "$SSH_PUBLIC_KEY" > "$KEYFILE"

try_launch() { # $1 shape  $2 image  $3 shape-config (ou vazio)
  local args=(compute instance launch
    --availability-domain "$AD" --compartment-id "$COMP"
    --shape "$1" --image-id "$2" --subnet-id "$SUBNET"
    --assign-public-ip true --display-name "$NAME"
    --ssh-authorized-keys-file "$KEYFILE"
    --query 'data.id' --raw-output)
  [[ -n "${3:-}" ]] && args+=(--shape-config "$3")
  local out
  out="$(oci "${args[@]}" 2>&1)"
  if [[ "$out" == ocid1.instance.* ]]; then
    log "✅ VM criada ($1): $out"
    return 0
  fi
  if grep -qiE "capacity" <<<"$out"; then
    log "   sem vaga: $1 ${3:-}"
  elif grep -qiE "TooManyRequests|429" <<<"$out"; then
    log "   limite de requisições, esperando mais..."; sleep 60
  elif grep -qiE "LimitExceeded" <<<"$out"; then
    log "   limite da conta para $1 ${3:-} (ok, tentando o próximo)"
  else
    log "   erro inesperado em $1: $(tr '\n' ' ' <<<"$out" | cut -c1-300)"
  fi
  return 1
}

round=0
while (( $(date +%s) < DEADLINE )); do
  round=$((round + 1))
  id="$(existing_vm)"
  if [[ -n "$id" ]]; then
    log "✅ A VM '$NAME' já existe: $id"
    exit 0
  fi
  log "Rodada $round"
  try_launch VM.Standard.A1.Flex   "$IMG_ARM" '{"ocpus":2,"memoryInGBs":12}' && exit 0
  try_launch VM.Standard.A1.Flex   "$IMG_ARM" '{"ocpus":1,"memoryInGBs":6}'  && exit 0
  try_launch VM.Standard.E2.1.Micro "$IMG_X86" ""                           && exit 0
  sleep "$INTERVAL"
done

log "⏱ Tempo esgotado sem vaga. Rode o workflow de novo."
exit 2
