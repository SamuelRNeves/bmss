// lib/api.ts
import axios, { AxiosError } from "axios";

// =====================================================
// 🔧 Configuração global do Axios
// =====================================================
const DEV_API_BASE = "http://localhost:8080/api/v1";
const PROD_DEFAULT_API_BASE = "https://bmss-backend.onrender.com/api/v1";

const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const normalizedConfiguredBase = configuredApiBase
  ? configuredApiBase.replace(/\/+$/, "")
  : undefined;

export const API_BASE_URL =
  normalizedConfiguredBase ||
  (process.env.NODE_ENV === "development"
    ? DEV_API_BASE
    : PROD_DEFAULT_API_BASE);

export function getRequiredApiBaseUrl(): string {
  return API_BASE_URL;
}

export function buildApiUrl(path: string): string {
  const baseUrl = getRequiredApiBaseUrl().replace(/\/+$/, "");
  const sanitizedPath = path.replace(/^\/+/, "");
  return `${baseUrl}/${sanitizedPath}`;
}

export function getFetchErrorMessage(error: unknown): string {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return "Tempo de resposta excedido. O backend pode estar lento.";
  }

  if (error instanceof TypeError) {
    return "Falha de conexão com o backend (CORS, rede ou servidor indisponível).";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

const api = axios.create({
  ...(API_BASE_URL ? { baseURL: API_BASE_URL } : {}),
});

api.interceptors.request.use((config) => {
  if (!config.baseURL) {
    config.baseURL = getRequiredApiBaseUrl();
  }

  return config;
});

const COINGECKO_BASE_URL =
  process.env.NEXT_PUBLIC_COINGECKO_BASE_URL ||
  process.env.COINGECKO_BASE_URL ||
  "https://api.coingecko.com/api/v3";

const COINGECKO_API_KEY =
  (process.env.NEXT_PUBLIC_COINGECKO_API_KEY ||
    process.env.COINGECKO_API_KEY ||
    "").trim();

const COINGECKO_API_KEY_HEADER =
  (process.env.NEXT_PUBLIC_COINGECKO_API_KEY_HEADER ||
    process.env.COINGECKO_API_KEY_HEADER ||
    "").trim();

const coingeckoHeaders: Record<string, string> = {
  Accept: "application/json",
  "User-Agent": "BMSS-Dashboard/1.0 (+https://github.com/)",
};

if (COINGECKO_API_KEY) {
  const resolvedHeader =
    COINGECKO_API_KEY_HEADER ||
    (COINGECKO_API_KEY.startsWith("CG-")
      ? "x-cg-demo-api-key"
      : "x-cg-pro-api-key");

  coingeckoHeaders[resolvedHeader] = COINGECKO_API_KEY;
}

const coingecko = axios.create({
  baseURL: COINGECKO_BASE_URL,
  timeout: 10000,
  headers: coingeckoHeaders,
});

let coinGeckoKeyWarningShown = false;

export function getBackendErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status) {
      return `${status} - ${error.response?.statusText || "Erro ao chamar backend"}`;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getCoinGeckoErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      if (!COINGECKO_API_KEY && !coinGeckoKeyWarningShown) {
        console.warn(
          "⚠️ Nenhuma chave de API da CoinGecko foi configurada. Defina NEXT_PUBLIC_COINGECKO_API_KEY (front-end) ou COINGECKO_API_KEY (backend) para obter dados reais."
        );
        coinGeckoKeyWarningShown = true;
      }

      return !COINGECKO_API_KEY
        ? "CoinGecko retornou 401 (chave ausente). Configure sua chave da CoinGecko nas variáveis de ambiente."
        : "CoinGecko retornou 401 (verifique se a chave configurada é válida ou se possui acesso ao endpoint).";
    }

    if (status) {
      return `${status} - ${error.response?.statusText || "Erro ao chamar CoinGecko"}`;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

// =====================================================
// 🧱 Interceptores globais
// =====================================================
/*api.interceptors.request.use((config) => {
  console.info(`➡️ [API] ${config.method?.toUpperCase()} ${config.url}`, config.params);
  return config;
});
*/
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
// 📦 Interfaces e Tipos
// =====================================================
export interface RegisterData {
  name: string;
  email: string;
  notificationPreference?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  error?: string;
  token?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isFallback: boolean;
  timestamp?: string;
}

interface PriceData {
  ano: number;
  price: number;
  priceFormatted: string;
  marco?: string;
}

interface HistoricoCompletoData {
  prices: PriceData[];
  totalDias: number;
  periodo: string;
  atualizado: string;
  precoAtual: number;
  precoInicial: number;
  crescimento: number;
  isFallback?: boolean;
}

interface PricePoint {
  date: string;
  timestamp: number;
  price: number;
  priceFormatted: string;
}

interface VolumePoint {
  date: string;
  timestamp: number;
  volume: number;
}

interface HistoricoData {
  prices: PricePoint[];
  volumes: VolumePoint[];
  periodo: string;
  atualizado: string;
  isFallback?: boolean;
}

const HISTORICAL_BASELINE_USD: Record<number, number> = {
  2009: 0.0008,
  2010: 0.3,
  2011: 4.6,
  2012: 13.4,
  2013: 805,
  2014: 320,
  2015: 430,
  2016: 963,
  2017: 14156,
  2018: 3848,
  2019: 7194,
  2020: 29374,
  2021: 46281,
  2022: 16547,
  2023: 42850,
  2024: 64500,
};

// =====================================================
// 💰 FUNÇÕES DE PREÇO ATUAL (REAIS)
// =====================================================
export async function getBitcoinPrice(): Promise<ApiResponse<any>> {
  try {
    console.group("💰 Buscando preço atual do Bitcoin (Binance via backend)...");

    const res = await api.get("/crypto/bitcoin");
    const payload = res.data;

    if (!payload?.success || !payload?.data) {
      throw new Error(payload?.error || "Resposta inválida do backend");
    }

    const data = payload.data;
    const isFallback = Boolean(payload.isFallback || data.isFallback);
    const timestamp =
      payload.timestamp || data.lastUpdated || new Date().toISOString();

    console.info("💰 Preço recebido:", data);
    console.groupEnd();

    return {
      data,
      error: null,
      isFallback,
      timestamp,
    };
  } catch (err: any) {
    const errorMessage = getBackendErrorMessage(err);
    console.error("❌ Erro ao buscar preço Bitcoin:", errorMessage);

    const fallbackData = gerarPrecoFallback();
    return {
      data: fallbackData,
      error: errorMessage,
      isFallback: true,
      timestamp: fallbackData.lastUpdated,
    };
  }
}

// =====================================================
// 📈 FUNÇÕES DE HISTÓRICO 24H
// =====================================================
export async function getBitcoin24h(): Promise<ApiResponse<any>> {
  try {
    console.group("📈 Buscando dados das últimas 24h (Binance via backend)...");

    const res = await api.get("/crypto/bitcoin/24h");
    const payload = res.data;

    if (!payload?.success || !payload?.data) {
      throw new Error(payload?.error || "Resposta inválida do backend");
    }

    const data = payload.data;
    const isFallback = Boolean(payload.isFallback || data.isFallback);
    const timestamp =
      payload.timestamp || data.lastUpdated || new Date().toISOString();

    console.info("💹 Dados 24h recebidos:", data);
    console.groupEnd();

    return {
      data,
      error: null,
      isFallback,
      timestamp,
    };
  } catch (err: any) {
    const errorMessage = getBackendErrorMessage(err);
    console.error("❌ Erro ao buscar dados 24h:", errorMessage);

    const fallbackData = gerarDados24hFallback();
    return {
      data: fallbackData,
      error: errorMessage,
      isFallback: true,
      timestamp: fallbackData.lastUpdated,
    };
  }
}

function gerarPrecoFallback() {
  const price = 64500;
  const lastUpdated = new Date().toISOString();

  return {
    price,
    priceUSD: price,
    priceBRL: null,
    change24h: "0.00",
    lastUpdated,
    currency: "USD",
    priceFormatted: new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
    }).format(price),
    priceFormattedBRL: null,
    source: "Fallback",
    isFallback: true,
  };
}

function gerarDados24hFallback() {
  const prices = [];
  const now = new Date();
  const basePrice = 64500;
  
  // Gerar dados das últimas 24 horas
  for (let i = 23; i >= 0; i--) {
    const hora = new Date();
    hora.setHours(now.getHours() - i);
    
    // Variação realista (±2%)
    const variation = (Math.random() - 0.5) * 0.04;
    const price = basePrice * (1 + variation);
    
    prices.push({
      timestamp: hora.getTime(),
      price: Number(price.toFixed(2)),
      time: `${hora.getHours().toString().padStart(2, '0')}:00`,
      priceFormatted: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD'
      }).format(price)
    });
  }
  
  // Calcular variação 24h
  const primeiroPreco = prices[0].price;
  const ultimoPreco = prices[prices.length - 1].price;
  const variacao = ((ultimoPreco - primeiroPreco) / primeiroPreco) * 100;
  
  return {
    prices,
    currentPriceUSD: Number(ultimoPreco.toFixed(2)),
    currentPriceBRL: null,
    change24h: variacao.toFixed(2),
    isFallback: true,
    source: "Fallback",
    lastUpdated: now.toISOString(),
  };
}

// =====================================================
// 📈 FUNÇÕES DE HISTÓRICO COMPLETO (REAIS)
// =====================================================
export async function getBitcoinHistoricoCompleto(): Promise<ApiResponse<HistoricoCompletoData>> {
  try {
    console.group("📈 Buscando histórico COMPLETO do Bitcoin (Binance via backend)...");

    const res = await api.get("/crypto/bitcoin/historico-completo");
    const payload = res.data;

    if (!payload?.success || !payload?.data) {
      throw new Error(payload?.error || "Resposta inválida do backend");
    }

    const processedData = processarDadosHistoricosReais(payload.data);
    const isFallback = Boolean(
      payload.isFallback || payload.data?.isFallback || processedData.isFallback
    );
    const timestamp = payload.timestamp || processedData.atualizado;

    console.info("📈 Histórico completo processado:", processedData);
    console.groupEnd();

    return {
      data: processedData,
      error: null,
      isFallback,
      timestamp,
    };
  } catch (err: any) {
    const errorMessage = getBackendErrorMessage(err);
    console.error("❌ Erro ao buscar histórico completo:", errorMessage);

    const fallbackData = gerarDadosHistoricosRealistas();
    return {
      data: fallbackData,
      error: errorMessage,
      isFallback: true,
      timestamp: fallbackData.atualizado,
    };
  }
}

// Processar dados REAIS da API
function processarDadosHistoricosReais(data: any): HistoricoCompletoData {
  if (!data || !data.prices || !Array.isArray(data.prices)) {
    throw new Error("Dados históricos inválidos");
  }

  const prices: [number, number][] = data.prices;
  
  console.log(`📊 Processando ${prices.length} pontos de dados históricos...`);
  
  // Agrupar por anos para performance e legibilidade
  const dadosAgrupados = agruparDadosReaisPorAno(prices);
  const dadosCompletos = complementarHistoricoComBase(dadosAgrupados);

  const precoAtual = dadosCompletos[dadosCompletos.length - 1]?.price || 0;
  const precoInicial = dadosCompletos[0]?.price || 0;
  const crescimento = precoInicial > 0 ? ((precoAtual - precoInicial) / precoInicial * 100) : 0;

  return {
    prices: dadosCompletos,
    totalDias: prices.length,
    periodo: dadosCompletos.length
      ? `${dadosCompletos[0].ano}-${dadosCompletos[dadosCompletos.length - 1].ano}`
      : `${new Date().getFullYear()}`,
    atualizado: new Date(prices[prices.length - 1][0]).toISOString(),
    precoAtual,
    precoInicial,
    crescimento,
    isFallback: false
  };
}

// Agrupar dados REAIS por ano
function agruparDadosReaisPorAno(prices: [number, number][]): PriceData[] {
  const anos: { [key: number]: { prices: number[], timestamps: number[] } } = {};
  
  // Agrupar todos os preços por ano
  prices.forEach(([timestamp, price]) => {
    const date = new Date(timestamp);
    const ano = date.getFullYear();
    
    if (!anos[ano]) {
      anos[ano] = { prices: [], timestamps: [] };
    }
    
    anos[ano].prices.push(price);
    anos[ano].timestamps.push(timestamp);
  });
  
  // Calcular preço médio anual e encontrar preço de fechamento
  return Object.entries(anos)
    .map(([ano, dados]) => {
      const precoMedio = dados.prices.reduce((sum, price) => sum + price, 0) / dados.prices.length;
      // Encontrar o último preço do ano (fechamento)
      const ultimoTimestamp = Math.max(...dados.timestamps);
      const lastIndex = dados.timestamps.lastIndexOf(ultimoTimestamp);
      const ultimoPreco = dados.prices[lastIndex >= 0 ? lastIndex : dados.timestamps.indexOf(ultimoTimestamp)] || precoMedio;
      
      return {
        ano: parseInt(ano),
        price: Number(ultimoPreco.toFixed(2)), // Usar preço de fechamento do ano
        priceFormatted: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'USD'
        }).format(ultimoPreco),
        marco: getMarcoHistoricoReal(parseInt(ano))
      };
    })
    .sort((a, b) => a.ano - b.ano)
    .filter(item => item.ano >= 2009); // Filtrar apenas anos relevantes
}

function complementarHistoricoComBase(dadosAgrupados: PriceData[]): PriceData[] {
  if (dadosAgrupados.length === 0) {
    return dadosAgrupados;
  }

  const menorAnoExistente = Math.min(...dadosAgrupados.map(item => item.ano));
  const existentes = new Set(dadosAgrupados.map(item => item.ano));
  const adicionais: PriceData[] = [];

  Object.entries(HISTORICAL_BASELINE_USD).forEach(([anoStr, precoBase]) => {
    const ano = Number(anoStr);
    if (ano < menorAnoExistente && !existentes.has(ano)) {
      adicionais.push({
        ano,
        price: precoBase,
        priceFormatted: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: precoBase < 1 ? 6 : 2,
          maximumFractionDigits: precoBase < 1 ? 6 : 2
        }).format(precoBase),
        marco: getMarcoHistoricoReal(ano)
      });
    }
  });

  return [...adicionais, ...dadosAgrupados].sort((a, b) => a.ano - b.ano);
}

// Marcos históricos baseados em anos REAIS
function getMarcoHistoricoReal(ano: number): string {
  const marcos: { [key: number]: string } = {
    2009: "🚀 Bitcoin Criado",
    2010: "🍕 Primeira Pizza (10k BTC)",
    2011: "💸 Parity com USD",
    2013: "📈 Primeira Bolha $1k",
    2017: "🎯 Futuros CME & $20k",
    2020: "🏛️ Halving & Estímulos",
    2021: "📊 ATH $69k",
    2024: "✅ ETF Spot Aprovado"
  };
  
  return marcos[ano] || "";
}

// Fallback com dados históricos REALISTAS (baseados em dados reais)
function gerarDadosHistoricosRealistas(): HistoricoCompletoData {
  const prices: PriceData[] = [];
  
  Object.entries(HISTORICAL_BASELINE_USD).forEach(([ano, price]) => {
    const anoNum = parseInt(ano);
    prices.push({
      ano: anoNum,
      price,
      priceFormatted: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: price < 1 ? 6 : 2,
        maximumFractionDigits: price < 1 ? 6 : 2
      }).format(price),
      marco: getMarcoHistoricoReal(anoNum)
    });
  });
  
  const precoAtual = HISTORICAL_BASELINE_USD[2024] || 64500;
  const precoInicial = HISTORICAL_BASELINE_USD[2009] || 0.0008;
  const crescimento = ((precoAtual - precoInicial) / precoInicial * 100);
  
  return {
    prices: prices.filter(p => p.ano >= 2009 && p.ano <= new Date().getFullYear()),
    totalDias: 5840, // ~16 anos
    periodo: "2009-2024",
    atualizado: new Date().toISOString(),
    precoAtual,
    precoInicial,
    crescimento,
    isFallback: true
  };
}

// =====================================================
// 📊 FUNÇÕES DE SENTIMENTO E TENDÊNCIAS
// =====================================================
export async function getSentimentos(): Promise<ApiResponse<any>> {
  try {
    console.group("📊 Buscando KPIs de Sentimento...");
    const res = await api.get("/sentimento");
    
    const data = res.data;
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
    
    const fallbackData = generateRealisticTrends();
    return { 
      data: fallbackData, 
      error: err.message, 
      isFallback: true 
    };
  }
}

function generateRealisticTrends() {
  const trends = [];
  const today = new Date();
  const basePositive = 0.35 + Math.random() * 0.2;
  const baseNegative = 0.15 + Math.random() * 0.15;
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
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

// =====================================================
// 👤 FUNÇÕES DE CADASTRO
// =====================================================
export async function cadastrarUsuario(data: RegisterData): Promise<RegisterResponse> {
  try {
    console.group("📝 Cadastrando usuário...");
    console.info("Dados do cadastro:", data);

    const response = await api.post("/auth/register", data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.info("✅ Cadastro realizado com sucesso:", response.data);
    console.groupEnd();

    return {
      success: true,
      message: response.data.message,
      user: response.data.user
    };
  } catch (error: any) {
    console.error("❌ Erro detalhado no cadastro:", error);
    
    if (error.response) {
      console.error("📊 Resposta do servidor:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    if (error.response?.data?.error) {
      return {
        success: false,
        error: error.response.data.error
      };
    } else if (error.code === "ECONNABORTED") {
      return {
        success: false,
        error: "Tempo de conexão esgotado. Tente novamente."
      };
    } else if (error.response?.status === 400) {
      return {
        success: false,
        error: "Dados inválidos enviados ao servidor."
      };
    } else if (error.response?.status === 500) {
      return {
        success: false,
        error: "Erro interno do servidor. Tente novamente mais tarde."
      };
    } else {
      return {
        success: false,
        error: "Erro de conexão com o servidor. Verifique sua internet."
      };
    }
  }
}

// =====================================================
// 📰 NOTÍCIAS e TWEETS
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

// =====================================================
// 📊 FUNÇÕES DE HISTÓRICO (30 DIAS, 1 ANO)
// =====================================================
export async function getBitcoinHistorico(
  dias: number = 30
): Promise<ApiResponse<HistoricoData>> {
  try {
    console.group("📈 Buscando histórico Bitcoin (Binance via backend)...");

    const res = await api.get("/crypto/bitcoin/historico", { params: { dias } });
    const payload = res.data;

    if (!payload?.success || !payload?.data) {
      throw new Error(payload?.error || "Resposta inválida do backend");
    }

    const processedData = processarDadosHistoricos(payload.data, dias);
    const isFallback = Boolean(
      payload.isFallback || payload.data?.isFallback || processedData.isFallback
    );
    const timestamp = payload.timestamp || processedData.atualizado;

    console.info("📈 Histórico processado:", processedData);
    console.groupEnd();

    return {
      data: processedData,
      error: null,
      isFallback,
      timestamp,
    };
  } catch (err: any) {
    const errorMessage = getBackendErrorMessage(err);
    console.error("❌ Erro ao buscar histórico Bitcoin:", errorMessage);

    const fallbackData = gerarDadosHistoricosFallback(dias);
    return {
      data: fallbackData,
      error: errorMessage,
      isFallback: true,
      timestamp: fallbackData.atualizado,
    };
  }
}

// Função para processar dados da API (30 dias, 1 ano)
function processarDadosHistoricos(data: any, dias: number): HistoricoData {
  if (!data || !data.prices) {
    return gerarDadosHistoricosFallback(dias);
  }

  if (!data || !Array.isArray(data.prices) || data.prices.length === 0) {
    return gerarDadosHistoricosFallback(dias);
  }

  const isDailyInterval = dias > 90;
  const pointsToTake = isDailyInterval ? Math.min(dias, data.prices.length) : Math.min(dias * 24, data.prices.length);

  const prices: [number, number][] = data.prices.slice(-pointsToTake);
  const volumes: [number, number][] = data.total_volumes ? data.total_volumes.slice(-pointsToTake) : [];

  return {
    prices: prices.map(([timestamp, price]) => ({
      date: new Date(timestamp).toLocaleDateString('pt-BR'),
      timestamp,
      price: Number(price.toFixed(2)),
      priceFormatted: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD'
      }).format(price)
    })),
    volumes: volumes.map(([timestamp, volume]) => ({
      date: new Date(timestamp).toLocaleDateString('pt-BR'),
      timestamp,
      volume: Math.round(volume / 1000000)
    })),
    periodo: `${dias} dias`,
    atualizado: new Date(prices[prices.length - 1][0]).toISOString(),
    isFallback: false
  };
}

// Fallback para histórico de 30 dias/1 ano
function gerarDadosHistoricosFallback(dias: number): HistoricoData {
  const prices: PricePoint[] = [];
  const volumes: VolumePoint[] = [];
  const basePrice = 45000;
  const today = new Date();
  
  for (let i = dias; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    const variation = (Math.random() - 0.5) * 0.1;
    const price = basePrice * (1 + variation * (i / dias));
    const volume = 25000 + Math.random() * 15000;
    
    prices.push({
      date: date.toLocaleDateString('pt-BR'),
      timestamp: date.getTime(),
      price: Number(price.toFixed(2)),
      priceFormatted: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD'
      }).format(price)
    });
    
    volumes.push({
      date: date.toLocaleDateString('pt-BR'),
      timestamp: date.getTime(),
      volume: Math.round(volume)
    });
  }
  
  return {
    prices,
    volumes,
    periodo: `${dias} dias`,
    atualizado: new Date().toISOString(),
    isFallback: true
  };
}

// =====================================================
// 📊 ENDPOINTS ADICIONAIS PARA HISTÓRICO
// =====================================================
export async function getBitcoinHistorico30Dias(): Promise<ApiResponse<HistoricoData>> {
  return getBitcoinHistorico(30);
}

export async function getBitcoinHistorico1Ano(): Promise<ApiResponse<HistoricoData>> {
  return getBitcoinHistorico(365);
}

export default api;