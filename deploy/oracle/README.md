# Deploy do BMSS na Oracle Cloud (Always Free)

Arquitetura depois da migração:

```
Usuário ──► Vercel (front-end Next.js)
                │  HTTPS
                ▼
        VM Oracle Arm (Always Free) ── docker compose
          ├─ caddy      → HTTPS automático (Let's Encrypt), portas 80/443
          ├─ backend    → Spring Boot (8080, rede interna)
          ├─ sentiment  → Flask + IA (5000, rede interna)
          └─ db         → PostgreSQL 16 (5432, rede interna, volume persistente)
```

Só o Caddy fica exposto à internet. Back-end, IA e banco conversam pela rede interna do Docker.

---

## 1. Criar a conta Oracle Cloud

1. Cadastre-se em <https://www.oracle.com/cloud/free/>.
2. A Oracle pede **cartão de crédito** para verificação, com uma pré-autorização que não vira cobrança. Cartão de débito com senha, virtual, de uso único ou pré-pago **não** é aceito.
3. Escolha a **região principal** com cuidado, porque ela não muda depois. **Brazil East (São Paulo)** ou **Brazil Southeast (Vinhedo)** dão latência menor.
4. Contas paradas por 30 dias ou mais podem ser suspensas. **Entre no console pelo menos uma vez por mês.**

## 2. Criar a VM

No console: **Compute → Instances → Create instance**.

| Campo | Valor |
|---|---|
| Image | **Canonical Ubuntu 24.04** (ou 22.04) |
| Shape | **Ampere → VM.Standard.A1.Flex** |
| OCPUs / Memória | **2 OCPU / 12 GB** é suficiente. Confira o selo *Always Free-eligible* |
| Networking | Crie uma VCN nova com sub-rede **pública** e marque *Assign a public IPv4 address* |
| SSH keys | *Generate a key pair* e **baixe a chave privada** |
| Boot volume | 50 GB (padrão) |

> Se aparecer **"Out of capacity"**, troque o *Availability Domain* ou tente mais tarde. É comum nas máquinas Arm gratuitas.

Anote o **IP público** da VM. No guia ele aparece como `129.146.10.20`.

## 3. Liberar as portas 80 e 443

**a) No console:** em **Networking → Virtual Cloud Networks → (sua VCN) → Security Lists → Default**, adicione duas *Ingress Rules*:

- Source `0.0.0.0/0`, TCP, porta de destino **80**
- Source `0.0.0.0/0`, TCP, porta de destino **443**

**b) Dentro da VM:** as imagens Ubuntu da Oracle já vêm com regras de firewall que bloqueiam tudo além do SSH:

```bash
ssh -i chave-privada.key ubuntu@129.146.10.20

sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 4. Instalar o Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit   # saia e entre de novo no SSH para o grupo valer
```

## 5. Baixar o projeto e configurar

```bash
git clone https://github.com/SamuelRNeves/bmss.git
cd bmss/deploy/oracle
cp .env.example .env
nano .env
```

Preencha o `.env`:

- **DOMAIN**: sem domínio próprio, use o [sslip.io](https://sslip.io) com o IP da VM trocando pontos por hífens. Exemplo: `129-146-10-20.sslip.io`. O Caddy emite o certificado HTTPS sozinho.
- **POSTGRES_PASSWORD**: `openssl rand -base64 24`
- **JWT_SECRET**: `openssl rand -base64 64`
- **NEWSAPI_API_KEY**: gere uma **chave nova** na NewsAPI, porque a antiga ficou pública no GitHub.
- **RESEND_*** e **CLOUDINARY_***: as mesmas credenciais que você usava no Render.

## 6. Subir tudo

```bash
docker compose up -d --build
```

O primeiro build leva alguns minutos, porque compila o Java e baixa o PyTorch e o modelo de IA. Para acompanhar:

```bash
docker compose ps
docker compose logs -f backend
```

Teste no navegador ou pelo terminal:

```bash
curl https://129-146-10-20.sslip.io/
```

## 7. Apontar o front-end (Vercel)

1. Abra o projeto no Vercel → **Settings → Environment Variables**.
2. Crie ou edite `NEXT_PUBLIC_API_BASE_URL` = `https://129-146-10-20.sslip.io/api/v1`.
3. Vá em **Deployments → Redeploy**. Variáveis `NEXT_PUBLIC_*` são lidas no build, então o redeploy é obrigatório.

O CORS do back-end já aceita `*.vercel.app` e `bmss.com.br`.

## 8. Dados antigos (opcional)

O Hibernate cria as tabelas sozinho (`ddl-auto=update`), então o sistema funciona com um banco vazio. Se você ainda tiver acesso ao banco do Render ou a um dump dele:

```bash
# Na sua máquina, com a URL externa do banco antigo:
pg_dump --no-owner --no-acl "postgresql://USUARIO:SENHA@HOST/BANCO" > dump.sql

# Copie para a VM e importe:
scp -i chave-privada.key dump.sql ubuntu@129.146.10.20:~/bmss/deploy/oracle/
docker compose exec -T db psql -U bmss -d bmss < dump.sql
```

## Manutenção

```bash
# Atualizar depois de um git push
cd ~/bmss && git pull && cd deploy/oracle && docker compose up -d --build

# Backup do banco (faça de vez em quando e guarde fora da VM)
docker compose exec -T db pg_dump -U bmss bmss > backup-$(date +%F).sql

# Reiniciar um serviço
docker compose restart backend
```

Os contêineres usam `restart: unless-stopped`, então voltam sozinhos se a VM reiniciar.

## Banco externo (alternativa)

Para usar um Postgres gerenciado, como o Neon, em vez do contêiner `db`, troque no `docker-compose.yml`:

```yaml
DATABASE_URL: jdbc:postgresql://HOST-DO-NEON/neondb?sslmode=require
DATABASE_USER: usuario
DATABASE_PASSWORD: senha
```

Depois remova o serviço `db` e o `depends_on` dele.
