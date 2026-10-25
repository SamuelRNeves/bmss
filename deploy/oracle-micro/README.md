# Deploy enxuto do BMSS na Oracle Cloud (AMD Micro, Always Free)

Esta é a versão para a VM **VM.Standard.E2.1.Micro**: 1 GB de RAM, x86, grátis para sempre. A Oracle permite até 2 dessas por conta, e elas costumam ter muito mais disponibilidade que as máquinas Arm.

O que muda em relação a `deploy/oracle` (versão Arm):

- **Análise de sentimento só por palavras-chave, dentro do próprio back-end Java.** Não há serviço Python nem PyTorch. As regras são as mesmas do `app.py`, e os resultados foram conferidos como idênticos em mais de 1.500 textos. No código original o modelo de IA já era só reserva, com as palavras-chave valendo 80% do peso. Sem ele, textos com palavras-chave inconclusivas são classificados como `neutral`.
- **As imagens chegam prontas do GitHub** (GHCR), compiladas pelo GitHub Actions. Compilar Java numa VM de 1/8 de CPU levaria muito tempo.
- **Java e Postgres com limites de memória** para caber em 1 GB, mais 2 GB de swap como folga.

```
Vercel (front) ──HTTPS──► VM AMD Micro (1 GB)
                            ├─ caddy      (HTTPS, 80/443)
                            ├─ backend    (Spring Boot, heap 256 MB)
                            └─ db         (Postgres, ~100 MB)
```

---

## 0. Antes de tudo: imagens públicas no GitHub

1. Depois do push, o workflow **Imagens Docker** roda sozinho. Acompanhe em **GitHub → Actions**.
2. Quando ele terminar, abra **github.com/SamuelRNeves?tab=packages**. Em `bmss-backend`, vá em **Package settings → Change visibility → Public**.

As imagens não contêm segredos, porque eles ficam no `.env` da VM. Sem esse passo, a VM precisaria de login no GitHub para baixar as imagens.

## 1. Criar a VM

No console da Oracle, em **Compute → Instances → Create instance**:

| Campo | Valor |
|---|---|
| Name | `bmss` |
| Image | **Canonical Ubuntu 24.04** (não a Minimal) |
| Shape | **Specialty and previous generation → VM.Standard.E2.1.Micro** (selo *Always Free-eligible*) |
| Networking | VCN `bmss-vcn`, sub-rede **pública**, *Automatically assign public IPv4* ligado |
| SSH keys | Use a sua chave (*Paste public key*) ou gere e **baixe a privada** |

A rede `bmss-vcn` já tem as portas 80 e 443 liberadas.

## 2. Entrar na VM e preparar o sistema

```bash
ssh -i chave-privada.key ubuntu@IP_DA_VM
```

**Swap de 2 GB** (essencial com 1 GB de RAM):

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf && sudo sysctl --system
```

**Firewall interno** (as imagens Ubuntu da Oracle bloqueiam tudo além do SSH):

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

**Docker:**

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit   # saia e entre de novo no SSH
```

## 3. Configurar e subir

```bash
git clone -b migracao-oracle-cloud https://github.com/SamuelRNeves/bmss.git
cd bmss/deploy/oracle-micro
cp .env.example .env
nano .env
```

Preencha o `.env`:

- **DOMAIN**: o IP da VM no sslip.io, trocando pontos por hífens. Exemplo: `129-146-10-20.sslip.io`.
- **POSTGRES_PASSWORD**: `openssl rand -base64 24`
- **JWT_SECRET**: `openssl rand -base64 64`
- **NEWSAPI_API_KEY**: gere uma **chave nova**, porque a antiga ficou pública no GitHub.
- **RESEND_*** e **CLOUDINARY_***: as mesmas credenciais de antes.

Depois:

```bash
docker compose pull
docker compose up -d
docker compose logs -f backend   # aguarde "Started BmssBackendApplication"
```

Na VM de 1/8 de CPU, o Spring Boot pode levar 1 a 3 minutos para iniciar. Isso é normal.

Teste:

```bash
curl https://129-146-10-20.sslip.io/
free -h                 # memória
docker stats --no-stream
```

## 4. Apontar o front-end (Vercel)

1. Abra **Settings → Environment Variables** no projeto do Vercel.
2. Defina `NEXT_PUBLIC_API_BASE_URL` = `https://129-146-10-20.sslip.io/api/v1`.
3. Faça um **Redeploy**.

## Manutenção

```bash
# Atualizar depois de um push. O GitHub Actions gera as imagens novas.
cd ~/bmss && git pull && cd deploy/oracle-micro
docker compose pull && docker compose up -d

# Backup do banco (guarde fora da VM)
docker compose exec -T db pg_dump -U bmss bmss > backup-$(date +%F).sql

# Limpar imagens antigas e liberar disco
docker image prune -f
```

> **Ociosidade:** a Oracle pode recuperar instâncias Always Free que passem 7 dias com CPU, rede e memória abaixo de 20%. Com o BMSS sendo acessado e coletando notícias, isso tende a não acontecer. Fique de olho se o site passar semanas sem uso.

## Voltar a usar o modelo de IA

Se um dia você conseguir a VM Arm (2 OCPU / 12 GB), use `deploy/oracle`. Ele roda o serviço completo, com PyTorch.
