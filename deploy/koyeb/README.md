# Deploy do BMSS no Koyeb (grátis) + banco no Supabase (grátis)

Nessa configuração, o BMSS roda como **um único serviço Spring Boot**. A análise de sentimento por palavras-chave fica dentro do Java, sem serviço Python. O banco PostgreSQL fica no Supabase.

```
Vercel (front) ──HTTPS──► Koyeb (Spring Boot, plano Free) ──► Supabase (Postgres)
```

**Limites do plano grátis do Koyeb:**
- 512 MB de RAM e 0,1 vCPU, com um serviço grátis por conta.
- Regiões só em Washington ou Frankfurt.
- O serviço **desliga depois de 1 hora sem acesso**. O primeiro acesso depois disso demora alguns minutos, porque o Spring Boot inicia devagar com 0,1 vCPU.
- O Koyeb pede cartão para verificação, mas o serviço grátis não gera cobrança.

**Plano grátis do Supabase:** o projeto pausa depois de 7 dias com pouca atividade no banco. Como o Koyeb desliga o serviço quando ninguém acessa, uma semana inteira sem visitas pode pausar o Supabase. Para reativar, abra o projeto no painel do Supabase e clique em **Resume**. Os dados ficam guardados.

---

## 0. Imagem pública no GitHub

O GitHub Actions compila a imagem `ghcr.io/samuelrneves/bmss-backend` a cada push. Ela precisa estar **pública**: em **github.com/SamuelRNeves?tab=packages → bmss-backend → Package settings → Change visibility → Public**.

## 1. Banco no Supabase

1. Crie uma conta em <https://supabase.com> e clique em **New project**.
2. Preencha:
   - **Name:** `bmss`
   - **Database password:** gere uma senha forte e **guarde**.
   - **Region:** **East US (North Virginia)**, que é a mais perto de Washington, onde fica o Koyeb.
3. Quando o projeto estiver pronto, clique em **Connect** (no topo) e copie a string do **Session pooler**. Ela tem este formato:

   ```
   postgresql://postgres.abcdxyz:[SENHA]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```

4. Separe as partes para usar no Koyeb:
   - `DATABASE_URL` = `jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`
   - `DATABASE_USER` = `postgres.abcdxyz`, o usuário que aparece antes dos dois-pontos
   - `DATABASE_PASSWORD` = a senha do passo 2

Use o **Session pooler**, não a conexão direta: a conexão direta do Supabase é só IPv6. As tabelas são criadas sozinhas pelo Hibernate no primeiro start.

## 2. Serviço no Koyeb

1. Crie uma conta em <https://www.koyeb.com>.
2. Clique em **Create Service → Web Service → Docker image**.
3. Em **Image**, use `ghcr.io/samuelrneves/bmss-backend:latest`.
4. Em **Instance**, escolha **Free**. Em **Region**, escolha **Washington, D.C.**
5. Em **Ports**, use `8080`, protocolo HTTP, path `/`.
6. Em **Environment variables**, preencha:

| Variável | Valor |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `TZ` | `America/Sao_Paulo` |
| `JAVA_TOOL_OPTIONS` | `-Xms128m -Xmx300m -XX:MaxMetaspaceSize=150m -XX:ReservedCodeCacheSize=48m -Xss512k -XX:+UseSerialGC -XX:TieredStopAtLevel=1` |
| `BMSS_SENTIMENT_MODE` | `local` |
| `DATABASE_URL` | do passo 1 |
| `DATABASE_USER` | do passo 1 |
| `DATABASE_PASSWORD` | do passo 1 (use **Secret**) |
| `JWT_SECRET` | gere com `openssl rand -base64 64` (use **Secret**) |
| `NEWSAPI_API_KEY` | **chave nova** da NewsAPI (use **Secret**) |
| `RESEND_API_KEY` | sua chave do Resend (use **Secret**) |
| `RESEND_FROM_EMAIL` | `BMSS Alerts <onboarding@resend.dev>` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | suas credenciais do Cloudinary |

7. Em **Health checks**, deixe TCP na porta 8080. Se o primeiro deploy falhar por health check, aumente o **grace period**, porque o Spring Boot com 0,1 vCPU pode levar alguns minutos para subir.
8. Dê o nome `bmss-backend` e clique em **Deploy**.

Quando ficar **Healthy**, o Koyeb mostra a URL pública, algo como `https://bmss-backend-samuel.koyeb.app`. Teste abrindo a URL no navegador.

## 3. Apontar o front-end (Vercel)

1. No Vercel, abra **Settings → Environment Variables**.
2. Defina `NEXT_PUBLIC_API_BASE_URL` = `https://SUA-URL.koyeb.app/api/v1`.
3. Faça um **Redeploy**.

O CORS do back-end já aceita `*.vercel.app` e `bmss.com.br`.

## Atualizações

Cada push na branch `prod` ou `migracao-oracle-cloud` gera uma imagem nova no GitHub. Para usá-la, abra o serviço no Koyeb e clique em **Redeploy**.

## Sobre o serviço "dormir"

Depois de 1 hora sem acessos, o Koyeb desliga o serviço. Nesse período:
- A tarefa agendada do meio-dia não roda.
- O primeiro visitante espera o Spring Boot iniciar.

Para uma apresentação de TCC, abra o site alguns minutos antes para ele já estar acordado.
