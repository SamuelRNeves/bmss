import axios from "axios";


const api = axios.create({
  baseURL: "http://localhost:8080/api/v1",
  // A coleta de notícias consulta a NewsAPI e envia os textos para o serviço
  // Flask realizar a análise de sentimento. Esse fluxo pode levar vários
  // segundos (principalmente na primeira execução, quando o modelo de NLP é
  // carregado), por isso aumentamos o timeout padrão para evitar que o
  // frontend aborte a requisição prematuramente.
  timeout: 15000,
});

// ========== ENDPOINTS ==========

// 1️⃣  KPIs de sentimento (Java → /sentimento)
export async function getSentimentos() {
  const res = await api.get("/sentimento");
  return res.data; // { positive: 0.47, neutral: 0.33, negative: 0.20 }
}

// 2️⃣  Tendências semanais (Java → /tendencias)
export async function getTendencias() {
  const res = await api.get("/tendencias");
  return res.data; // [{ day:"2025-10-01", positive:45, neutral:30, negative:25 }, ...]
}

export async function getUltimasNoticias(limit = 12, q = "bitcoin") {
  try {
    const res = await api.get(`/noticias/ultimas`, { params: { limit, q } });
    if (res.status === 200) return res.data;
    console.error("⚠️ Resposta inesperada:", res.status, res.data);
    return [];
  } catch (err) {
    if (axios.isAxiosError(err) && err.code === "ECONNABORTED") {
      console.error(
        "⏳ Requisição de notícias expirou antes do backend responder. Considere verificar o serviço Flask/NewsAPI.",
      );
    } else {
      console.error("❌ Erro ao buscar notícias:", err);
    }
    return [];
  }
}



// 4️⃣  Cadastrar notícia (Java → /noticias)
export async function cadastrarNoticia(payload: {
  titulo: string;
  conteudo: string;
  fonte: string;
}) {
  const res = await api.post("/noticias", payload);
  return res.data;
}

// 5️⃣  Cadastrar usuário (Java → /usuarios)
export async function cadastrarUsuario(payload: { nome: string; email: string }) {
  const res = await api.post("/usuarios", payload);
  return res.data;
}

export default api;
