import axios, { AxiosError } from "axios";

// =====================================================
// 🔧 Configuração global do Axios
// =====================================================
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

// =====================================================
// 🧱 Interceptores globais
// =====================================================
api.interceptors.request.use((config) => {
  console.info(`➡️ [API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response) {
      console.error(`❌ [API] ${error.response.status}: ${error.response.statusText}`);
    } else if (error.code === "ECONNABORTED") {
      console.warn("⏳ Timeout: backend demorou para responder.");
    } else {
      console.error("⚠️ Erro desconhecido:", error.message);
    }
    return Promise.reject(error);
  }
);

// =====================================================
// 📦 Tipo de retorno padrão
// =====================================================
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isFallback: boolean;
}

// =====================================================
// 🧩 Endpoints de Sentimento e Tendência
// =====================================================
export async function getSentimentos(): Promise<ApiResponse<any>> {
  try {
    const res = await api.get("/sentimento");
    return { data: res.data, error: null, isFallback: false };
  } catch (err: any) {
    return {
      data: { positive: 0, neutral: 0, negative: 0 },
      error: err.message,
      isFallback: true,
    };
  }
}

export async function getTendencias(): Promise<ApiResponse<any>> {
  try {
    const res = await api.get("/tendencias");
    return { data: res.data, error: null, isFallback: false };
  } catch (err: any) {
    return { data: [], error: err.message, isFallback: true };
  }
}

// =====================================================
// 📰 NOTÍCIAS
// =====================================================
export async function getUltimasNoticias(limit = 12, q = "bitcoin"): Promise<ApiResponse<any[]>> {
  try {
    const res = await api.get(`/noticias/ultimas`, { params: { limit, q } });

    // 🔍 Aceita tanto { data: [...] } quanto uma lista direta
    const noticias = Array.isArray(res.data)
      ? res.data
      : res.data?.data || [];

    console.info("📰 Notícias recebidas:", noticias.length);
    return { data: noticias, error: null, isFallback: false };
  } catch (err: any) {
    console.error("⚠️ Erro ao buscar últimas notícias:", err.message);
    return { data: [], error: err.message, isFallback: true };
  }
}

// Dispara análise manualmente
export async function analisarNoticias(limit = 5, q = "bitcoin"): Promise<ApiResponse<any>> {
  try {
    const res = await api.post(`/noticias/analisar`, null, { params: { limit, q } });
    return { data: res.data, error: null, isFallback: false };
  } catch (err: any) {
    console.error("❌ Erro ao analisar notícias:", err.message);
    return { data: null, error: err.message, isFallback: true };
  }
}

// =====================================================
// 🐦 TWEETS
// =====================================================

// 🔹 Buscar últimos tweets (separado das notícias)
export async function getUltimosTweets(limit = 10, q = "bitcoin"): Promise<ApiResponse<any[]>> {
  try {
    const res = await api.get(`/noticias/tweets/ultimos`, { params: { limit, q } });

    const tweets = Array.isArray(res.data)
      ? res.data
      : res.data?.data || [];

    console.info("🐦 Tweets recebidos:", tweets.length);
    return { data: tweets, error: null, isFallback: false };
  } catch (err: any) {
    console.error("⚠️ Erro ao buscar tweets:", err.message);
    return { data: [], error: err.message, isFallback: true };
  }
}

// 🔹 Dispara análise de tweets (executa fetchAndStoreTweets no backend)
export async function analisarTweets(q = "bitcoin"): Promise<ApiResponse<any>> {
  try {
    const res = await api.post(`/noticias/analisar-tweets`, null, { params: { q } });
    return { data: res.data, error: null, isFallback: false };
  } catch (err: any) {
    console.error("❌ Erro ao analisar tweets:", err.message);
    return { data: null, error: err.message, isFallback: true };
  }
}

// =====================================================
// 👤 USUÁRIOS (Cadastro simples)
// =====================================================
export async function cadastrarUsuario(payload: {
  nome: string;
  email: string;
}): Promise<ApiResponse<any>> {
  try {
    const res = await api.post("/usuarios", payload);
    return { data: res.data, error: null, isFallback: false };
  } catch (err: any) {
    console.error("❌ Erro ao cadastrar usuário:", err.message);
    return { data: null, error: err.message, isFallback: true };
  }
}



export default api;
