import axios from "axios";


const api = axios.create({
  baseURL: "http://localhost:8080/api/v1",
  // O backend consulta a NewsAPI e chama o serviço Flask para calcular sentimento.
  // Esse fluxo pode levar alguns segundos na primeira requisição, então
  // ampliamos o timeout para evitar abortar a chamada prematuramente.
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
        "⏳ A requisição de notícias expirou. Verifique se o backend/Flask está processando as análises.",
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
