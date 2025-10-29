// lib/api.ts
import axios, { AxiosError } from "axios";

// =====================================================
// 🔧 Configuração global do Axios
// =====================================================
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 12000, 
});

// =====================================================
// 🧱 Interceptores globais
// =====================================================
api.interceptors.request.use((config) => {
  console.info(`➡️ [API] ${config.method?.toUpperCase()} ${config.url}`, config.params);
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.info(`✅ [API] ${res.status}: ${res.config.url}`);
    return res;
  },
  (error: AxiosError) => {
    if (error.response) {
      console.error(`❌ [API] ${error.response.status}: ${error.config?.url}`);
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
  timestamp?: string;
}

// =====================================================
// 🧩 Sentimento e Tendência - CORRIGIDOS
// =====================================================
export async function getSentimentos(): Promise<ApiResponse<any>> {
  try {
    console.group("📊 Buscando KPIs de Sentimento...");
    const res = await api.get("/sentimento");
    
    const data = res.data;
    console.info("📈 Dados recebidos:", data);
    
    // 🔹 Garantir que os valores são números entre 0 e 1
    const processedData = {
      positive: Math.max(0, Math.min(1, Number(data.positive || 0) / 100)),
      neutral: Math.max(0, Math.min(1, Number(data.neutral || 0) / 100)),
      negative: Math.max(0, Math.min(1, Number(data.negative || 0) / 100)),
      totalAnalisados: data.totalAnalisados || 0,
      timestamp: data.timestamp,
      isFallback: data.fallback || false
    };
    
    console.info("📊 KPIs processados:", processedData);
    console.groupEnd();
    
    return { 
      data: processedData, 
      error: null, 
      isFallback: data.fallback || false 
    };
  } catch (err: any) {
    console.error("❌ Erro ao buscar sentimentos:", err.message);
    
    // 🔹 Fallback mais inteligente baseado em dados reais
    const fallbackData = {
      positive: 0.35,
      neutral: 0.45,
      negative: 0.20,
      totalAnalisados: 0,
      timestamp: new Date().toISOString(),
      isFallback: true
    };
    
    return { 
      data: fallbackData, 
      error: err.message, 
      isFallback: true 
    };
  }
}

export async function getTendencias(): Promise<ApiResponse<any>> {
  try {
    console.group("📈 Buscando Tendências...");
    const res = await api.get("/tendencias");
    const data = res.data;
    
    console.info("📊 Dados de tendências recebidos:", data);
    
    // 🔹 Processar dados para garantir formato correto
    const processedData = Array.isArray(data) ? data.map((day: any) => ({
      day: day.day || "N/D",
      positive: Math.max(0, Math.min(1, Number(day.positive || 0) / 100)),
      neutral: Math.max(0, Math.min(1, Number(day.neutral || 0) / 100)),
      negative: Math.max(0, Math.min(1, Number(day.negative || 0) / 100)),
      total: day.total || 0,
      isFallback: day.fallback || false
    })) : [];
    
    console.info("📈 Tendências processadas:", processedData);
    console.groupEnd();
    
    return { 
      data: processedData, 
      error: null, 
      isFallback: processedData.some((day: any) => day.isFallback) 
    };
  } catch (err: any) {
    console.error("❌ Erro ao buscar tendências:", err.message);
    
    // 🔹 Fallback com dados mais realistas
    const fallbackData = generateRealisticTrends();
    return { 
      data: fallbackData, 
      error: err.message, 
      isFallback: true 
    };
  }
}

// 🔹 Gerador de tendências realistas para fallback
function generateRealisticTrends() {
  const trends = [];
  const today = new Date();
  
  // Tendência mais realista baseada em mercado crypto
  const basePositive = 0.35 + Math.random() * 0.2;
  const baseNegative = 0.15 + Math.random() * 0.15;
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    // Variação suave day-to-day
    const variation = (Math.random() - 0.5) * 0.1;
    const positive = Math.max(0.1, Math.min(0.8, basePositive + variation));
    const negative = Math.max(0.1, Math.min(0.6, baseNegative - variation * 0.5));
    const neutral = Math.max(0.1, 1 - positive - negative);
    
    trends.push({
      day: `${date.getDate()}/${date.getMonth() + 1}`,
      positive: Number(positive.toFixed(2)),
      neutral: Number(neutral.toFixed(2)),
      negative: Number(negative.toFixed(2)),
      total: Math.floor(15 + Math.random() * 20),
      isFallback: true
    });
  }
  
  return trends;
}



// lib/api.ts - Adicione esta função
export async function getBitcoinPrice(): Promise<ApiResponse<any>> {
  try {
    const res = await api.get("/crypto/bitcoin");
    return { 
      data: res.data, 
      error: null, 
      isFallback: !res.data.success 
    };
  } catch (err: any) {
    console.error("❌ Erro ao buscar cotação Bitcoin:", err.message);
    return { 
      data: null, 
      error: err.message, 
      isFallback: true 
    };
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
    console.group(`📰 Buscando ${type}...`);
    const res = await api.get(`/noticias/ultimas`, {
      params: { limit, q, type, analyze },
    });

    const payload = res.data?.data;
    if (!Array.isArray(payload)) {
      throw new Error(`Formato inesperado ao carregar ${type} (data ausente)`);
    }

    console.info(`📡 ${type === "news" ? "Notícias" : "Tweets"} recebidos:`, payload.length);
    console.groupEnd();
    
    return { 
      data: payload, 
      error: null, 
      isFallback: false 
    };
  } catch (err: any) {
    console.error(`⚠️ Erro ao buscar ${type}:`, err.message);
    return { 
      data: [], 
      error: err.message, 
      isFallback: true 
    };
  }
}

export default api;