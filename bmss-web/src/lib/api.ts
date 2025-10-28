import axios, { AxiosError } from "axios";

// =====================================================
// 🔧 Configuração global do Axios
// =====================================================
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
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
// 🧩 Sentimento e Tendência
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
// 📰 NOTÍCIAS e TWEETS unificados
// =====================================================
export async function getFeed(
  type: "news" | "tweets" = "news",
  limit = 20,
  q = "bitcoin",
  analyze = false
): Promise<ApiResponse<any[]>> {
  try {
    const res = await api.get(`/noticias/ultimas`, {
      params: { limit, q, type, analyze },
    });

    const payload = res.data?.data;
    if (!Array.isArray(payload)) {
      throw new Error(`Formato inesperado ao carregar ${type} (data ausente)`);
    }

    console.info(`📡 ${type === "news" ? "Notícias" : "Tweets"} recebidos:`, payload.length);
    return { data: payload, error: null, isFallback: false };
  } catch (err: any) {
    console.error(`⚠️ Erro ao buscar ${type}:`, err.message);
    return { data: [], error: err.message, isFallback: true };
  }
}

export default api;
