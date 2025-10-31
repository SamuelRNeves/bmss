// lib/api.ts
import axios, { AxiosError } from "axios";

// =====================================================
// 🔧 Configuração global do Axios
// =====================================================
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
});

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

// =====================================================
// 💰 FUNÇÕES DE PREÇO ATUAL (REAIS)
// =====================================================
export async function getBitcoinPrice(): Promise<ApiResponse<any>> {
  try {
    console.group("💰 Buscando preço atual do Bitcoin...");
    const res = await api.get("/crypto/bitcoin");
    
    const data = res.data;
    console.info("💵 Resposta completa da API:", data);
    
    if (data && data.success) {
      const processedData = {
        price: data.price || 64500, // 🔥 Fallback garantido
        change24h: data.change24h ? Number(data.change24h).toFixed(2) : "2.30",
        lastUpdated: data.lastUpdated,
        currency: data.currency || 'USD',
        priceFormatted: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'USD'
        }).format(data.price || 64500), // 🔥 Fallback garantido
        isFallback: data.isFallback || false
      };
      
      console.info("💰 Preço processado:", processedData);
      console.groupEnd();
      
      return { 
        data: processedData, 
        error: null, 
        isFallback: data.isFallback || false 
      };
    } else {
      console.warn("⚠️ API retornou sucesso=false, usando fallback");
      // Fallback garantido
      const fallbackData = {
        price: 64500,
        change24h: "2.30",
        lastUpdated: new Date().toISOString(),
        currency: 'USD',
        priceFormatted: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'USD'
        }).format(64500),
        isFallback: true
      };
      
      return { 
        data: fallbackData, 
        error: data?.error || "Erro na API", 
        isFallback: true 
      };
    }
  } catch (err: any) {
    console.error("❌ Erro ao buscar preço Bitcoin:", err.message);
    
    // Fallback garantido
    const fallbackData = {
      price: 64500,
      change24h: "2.30",
      lastUpdated: new Date().toISOString(),
      currency: 'USD',
      priceFormatted: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD'
      }).format(64500),
      isFallback: true
    };
    
    return { 
      data: fallbackData, 
      error: err.message, 
      isFallback: true 
    };
  }
}


// =====================================================
// 📈 FUNÇÕES DE HISTÓRICO 24H
// =====================================================
export async function getBitcoin24h(): Promise<ApiResponse<any>> {
  try {
    console.group("📈 Buscando dados das últimas 24h...");
    const res = await api.get("/crypto/bitcoin/24h");
    
    const data = res.data;
    console.info("💹 Dados 24h recebidos:", data);
    
    if (data.success && data.data) {
      const processedData = {
        prices: data.data.map((item: any) => ({
          timestamp: item.timestamp,
          price: Number(item.price.toFixed(2)),
          time: item.time,
          priceFormatted: item.priceFormatted || new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
          }).format(item.price)
        })),
        currentPrice: data.currentPrice,
        change24h: data.change24h ? Number(data.change24h).toFixed(2) : "0.00",
        isFallback: data.isFallback || false
      };
      
      console.info("💹 Dados 24h processados:", processedData);
      console.groupEnd();
      
      return { 
        data: processedData, 
        error: null, 
        isFallback: data.isFallback || false 
      };
    } else {
      throw new Error(data.error || "Erro ao buscar dados 24h");
    }
  } catch (err: any) {
    console.error("❌ Erro ao buscar dados 24h:", err.message);
    
    // Fallback com dados simulados
    const fallbackData = gerarDados24hFallback();
    return { 
      data: fallbackData, 
      error: err.message, 
      isFallback: true 
    };
  }
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
    currentPrice: ultimoPreco,
    change24h: variacao.toFixed(2),
    isFallback: true
  };
}

// =====================================================
// 📈 FUNÇÕES DE HISTÓRICO COMPLETO (REAIS)
// =====================================================
export async function getBitcoinHistoricoCompleto(): Promise<ApiResponse<HistoricoCompletoData>> {
  try {
    console.group("📈 Buscando histórico COMPLETO do Bitcoin...");
    const res = await api.get("/crypto/bitcoin/historico-completo");
    
    const data = res.data;
    console.info("📊 Dados históricos completos recebidos:", data);
    
    if (data.success && data.data) {
      const processedData = processarDadosHistoricosReais(data.data);
      console.info("📈 Histórico completo processado:", processedData);
      console.groupEnd();
      
      return { 
        data: processedData, 
        error: null, 
        isFallback: false 
      };
    } else {
      throw new Error(data.error || "Erro na resposta da API");
    }
  } catch (err: any) {
    console.error("❌ Erro ao buscar histórico completo:", err.message);
    
    // Usar fallback imediatamente sem tentar endpoint alternativo
    const fallbackData = gerarDadosHistoricosRealistas();
    return { 
      data: fallbackData, 
      error: err.message, 
      isFallback: true 
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
  
  const precoAtual = prices[prices.length - 1]?.[1] || 0;
  const precoInicial = prices[0]?.[1] || 0;
  const crescimento = precoInicial > 0 ? ((precoAtual - precoInicial) / precoInicial * 100) : 0;
  
  return {
    prices: dadosAgrupados,
    totalDias: prices.length,
    periodo: `${new Date(prices[0][0]).getFullYear()}-${new Date().getFullYear()}`,
    atualizado: new Date().toISOString(),
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
      const ultimoPreco = dados.prices[dados.timestamps.indexOf(ultimoTimestamp)] || precoMedio;
      
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
  
  // Dados históricos REAIS aproximados do Bitcoin (preços de fechamento anual)
  const precosHistoricosReais: { [key: number]: number } = {
    2009: 0.0008,    // Primeiros preços
    2010: 0.30,      // Fim de 2010
    2011: 4.60,      // Fim de 2011  
    2012: 13.40,     // Fim de 2012
    2013: 805.00,    // Fim de 2013 (bolha)
    2014: 320.00,    // Fim de 2014 (correção)
    2015: 430.00,    // Fim de 2015
    2016: 963.00,    // Fim de 2016
    2017: 14156.00,  // Fim de 2017 (bull run)
    2018: 3848.00,   // Fim de 2018 (bear market)
    2019: 7194.00,   // Fim de 2019
    2020: 29374.00,  // Fim de 2020 (halving + QE)
    2021: 46281.00,  // Fim de 2021 (ATH $69k)
    2022: 16547.00,  // Fim de 2022 (crypto winter)
    2023: 42850.00,  // Fim de 2023
    2024: 64500.00,  // Atual 2024 (ETF approved)
  };
  
  Object.entries(precosHistoricosReais).forEach(([ano, price]) => {
    const anoNum = parseInt(ano);
    prices.push({
      ano: anoNum,
      price,
      priceFormatted: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD'
      }).format(price),
      marco: getMarcoHistoricoReal(anoNum)
    });
  });
  
  const precoAtual = precosHistoricosReais[2024] || 64500;
  const precoInicial = precosHistoricosReais[2009] || 0.0008;
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
export async function getBitcoinHistorico(dias: number = 30): Promise<ApiResponse<HistoricoData>> {
  try {
    console.group("📈 Buscando histórico Bitcoin...");
    const endpoint = dias === 365 ? "/crypto/bitcoin/historico-1ano" : "/crypto/bitcoin/historico";
    const res = await api.get(endpoint);
    
    const data = res.data;
    const processedData = processarDadosHistoricos(data.data, dias);
    
    console.info("📈 Histórico processado:", processedData);
    console.groupEnd();
    
    return { 
      data: processedData, 
      error: null, 
      isFallback: !data.success 
    };
  } catch (err: any) {
    console.error("❌ Erro ao buscar histórico Bitcoin:", err.message);
    
    const fallbackData = gerarDadosHistoricosFallback(dias);
    return { 
      data: fallbackData, 
      error: err.message, 
      isFallback: true 
    };
  }
}

// Função para processar dados da API (30 dias, 1 ano)
function processarDadosHistoricos(data: any, dias: number): HistoricoData {
  if (!data || !data.prices) {
    return gerarDadosHistoricosFallback(dias);
  }

  const prices: [number, number][] = data.prices.slice(-dias);
  const volumes: [number, number][] = data.total_volumes ? data.total_volumes.slice(-dias) : [];
  
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
    atualizado: new Date().toISOString()
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