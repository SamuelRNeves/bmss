
🚀 Bitcoin Market Sentiment System (BMSS)












O BMSS (Bitcoin Market Sentiment System) é uma aplicação full stack com microsserviços que coleta notícias e publicações sobre Bitcoin, realiza análise de sentimento utilizando Inteligência Artificial e apresenta os resultados em um dashboard interativo.

O objetivo do sistema é transformar grandes volumes de informação do mercado em um indicador visual de sentimento, auxiliando investidores e analistas a entender o humor geral do mercado.

⚠️ O sistema não prevê preço do Bitcoin, apenas analisa o sentimento presente em conteúdos públicos.

📊 Demonstração
Dashboard de Sentimento

(adicione aqui um print do sistema)

/docs/dashboard.png
Gráfico de tendência de sentimento
/docs/sentiment-chart.png
Distribuição de sentimento
/docs/sentiment-distribution.png
🏗️ Arquitetura do Sistema

O projeto foi desenvolvido utilizando arquitetura de microsserviços, separando responsabilidades entre frontend, backend e IA.

Frontend (Next.js / React)
        │
        ▼
Backend API (Spring Boot)
        │
        ▼
Microserviço de IA (Python / Flask)
        │
        ▼
Banco de Dados (PostgreSQL)
Fluxo do sistema

1️⃣ Frontend solicita dados ao backend
2️⃣ Backend coleta notícias ou tweets
3️⃣ Backend envia textos para o microserviço de IA
4️⃣ IA analisa o sentimento do conteúdo
5️⃣ Resultado é armazenado no PostgreSQL
6️⃣ Frontend apresenta os dados em gráficos no dashboard

🧠 Análise de Sentimento

O BMSS utiliza uma estratégia híbrida de análise.

1️⃣ Keyword Engine

Um mecanismo de palavras-chave financeiras analisa o texto atribuindo pontuações positivas ou negativas.

Exemplo:

bullish → positivo
crash → negativo
surge → positivo
panic → negativo
2️⃣ Modelo NLP (Transformers)

Caso o resultado não seja conclusivo, o sistema utiliza um modelo baseado em:

FinBERT

DistilRoBERTa

Biblioteca utilizada:

Hugging Face Transformers
3️⃣ Combinação de resultados

O sistema combina os dois métodos:

80% análise por palavras-chave
20% modelo de IA

Isso permite:

✔ alta velocidade
✔ baixo custo computacional
✔ boa precisão

🛠️ Tecnologias Utilizadas
Frontend

React

Next.js

TypeScript

TailwindCSS

Chart.js / Recharts

Deploy:

Vercel
Backend

Java 17

Spring Boot

Spring Web

Spring Data JPA

Hibernate

PostgreSQL

Deploy:

Render
Microserviço de IA

Python

Flask

Hugging Face Transformers

FinBERT

NLP

Deploy:

Render
🗄️ Banco de Dados

Principais tabelas:

users
roles
sources
items
sentiments

Relacionamentos principais:

users → roles
items → sources
sentiments → items
🔌 API Endpoints
Bitcoin

Obter preço atual

GET /api/v1/crypto/bitcoin

Histórico de preço

GET /api/v1/crypto/bitcoin/historico?dias=30
Notícias

Últimas notícias

GET /api/v1/noticias/ultimas
Tweets

Últimos tweets

GET /api/v1/noticias/tweets/ultimos
IA

Analisar textos

POST /analyze-batch

Exemplo:

[
 "Bitcoin sobe após aprovação de ETF",
 "Mercado teme nova queda do BTC"
]

Resposta:

[
 { "label": "positive", "score": 0.85 },
 { "label": "negative", "score": -0.62 }
]
⚙️ Variáveis de Ambiente
Frontend
NEXT_PUBLIC_API_BASE_URL
Backend
DATABASE_URL
DATABASE_USER
DATABASE_PASSWORD
SPRING_PROFILES_ACTIVE
🚀 Deploy

O sistema está hospedado utilizando plataformas modernas de cloud.

Frontend

Vercel

Backend

Render

Microserviço IA

Render
⚠️ Limitações

Dependência de APIs externas

Modelos NLP podem interpretar sarcasmo incorretamente

Palavras-chave precisam de manutenção contínua

🔮 Trabalhos Futuros

Suporte a múltiplas criptomoedas

Stream de dados em tempo real

Treinamento de modelos específicos para português

Sistema de alertas de mercado

Análise de tendências com Machine Learning

👨‍💻 Autor

Samuel Rodrigues de Oliveira Neves

Desenvolvedor Full Stack

GitHub
https://github.com/SamuelRNeves

LinkedIn
www.linkedin.com/in/samuelronevesdev

