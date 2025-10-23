import axios from "axios";

export interface NewsItem {
  id?: string | number;
  title: string;
  description: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  sentimento?: string;
  score?: number;
}

export interface NoticiasResponse {
  items: NewsItem[];
  fromCache: boolean;
  usingFallback: boolean;
  fallbackSource?: string | null;
  partial: boolean;
  message?: string | null;
  warnings: string[];
  errors: string[];
}

const api = axios.create({
  baseURL: "http://localhost:8080/api/v1",
  timeout: 5000,
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
    const res = await api.get<NoticiasResponse>(`/noticias/ultimas`, {
      params: { limit, q },
    });
    if (res.status === 200) {
      return res.data;
    }
    throw new Error(`Resposta inesperada do servidor (${res.status}).`);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? "erro";
      const detail =
        (err.response?.data && (err.response.data.message || err.response.data.error)) ||
        err.message;
      throw new Error(`Falha ao buscar notícias (${status}): ${detail}`);
    }
    throw err;
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
