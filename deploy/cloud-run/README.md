# Deploy do BMSS no Google Cloud Run (grátis) + Supabase

```
Vercel (front) ──HTTPS──► Cloud Run (Spring Boot, us-west1) ──► Supabase (Postgres, us-west-2)
```

- **Custo:** dentro da camada gratuita mensal do Cloud Run, que inclui 180 mil vCPU-segundos, 360 mil GiB-segundos e 2 milhões de requisições. Só é cobrado o tempo em que o serviço está atendendo. O script limita o serviço a **1 instância** para evitar surpresas.
- **Quando ninguém acessa,** o serviço desliga. O primeiro acesso depois disso leva uns 10 a 20 segundos.
- **A imagem** é a mesma que o GitHub Actions publica em `ghcr.io/samuelrneves/bmss-backend`. O Artifact Registry só faz um espelho dela.

## Passo a passo

1. Crie um projeto em <https://console.cloud.google.com> e ative o **faturamento**. O cartão serve para verificação.
2. **Crie um alerta de orçamento** em **Billing → Budgets & alerts**, com valor de US$ 1. Assim você recebe um e-mail se qualquer cobrança começar.
3. Abra o **Cloud Shell** pelo ícone `>_` no topo do console e rode:

   ```bash
   gcloud config set project ID_DO_SEU_PROJETO
   git clone -b migracao-oracle-cloud https://github.com/SamuelRNeves/bmss.git
   bash bmss/deploy/cloud-run/deploy.sh
   ```

4. O script vai pedir:
   - a senha do banco do Supabase;
   - uma **chave nova** da NewsAPI;
   - as chaves do Resend e do Cloudinary (opcionais).

   Nada do que você digita aparece na tela. O segredo do JWT é gerado sozinho. Tudo fica guardado no Secret Manager.
5. No final, o script mostra a URL do serviço. No Vercel, defina `NEXT_PUBLIC_API_BASE_URL` = `URL/api/v1` e faça **Redeploy**.

## Atualizar

Depois de um push que gere uma imagem nova, rode no Cloud Shell:

```bash
gcloud run deploy bmss-backend --region=us-west1 \
  --image=us-west1-docker.pkg.dev/$(gcloud config get-value project)/ghcr/samuelrneves/bmss-backend:latest
```

## Observações

- A tarefa agendada do back-end, que roda ao meio-dia, só executa se houver uma instância ativa nesse horário.
- O Supabase grátis pausa depois de 7 dias com pouca atividade no banco. Para reativar, abra o projeto no painel do Supabase e clique em **Resume**.
