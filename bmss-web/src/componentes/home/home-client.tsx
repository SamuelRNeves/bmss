"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { StatsCard } from "@/componentes/dashboard/stats-cards";
import { StatusBar } from "@/componentes/status/status-bar";
import { ToastNotifier, showToast } from "@/componentes/notifications/toast-notifier";
import { SentimentBadge } from "@/componentes/status/sentiment-badge";
import LegendaSentimentos from "@/componentes/status/LegendaSentimentos";
import Header from "@/componentes/layout/Header";

import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Twitter,
  BarChart3,
  RefreshCw,
} from "lucide-react";

import { buildApiUrl, getFetchErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import BitcoinPriceClient from "../BitcoinPriceClient";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { SentimentDistribution } from "@/componentes/charts/sentiment-distribution";

// ✅ LAZY LOAD DE TODOS OS COMPONENTES PESADOS
const Recomendacoes = React.lazy(() => import("@/componentes/Recomendacoes"));
const SentimentChart = React.lazy(() => import("@/componentes/charts/sentiment-chart"));
const PriceChartSafe = React.lazy(() => import("@/componentes/charts/PriceChartSafe"));
const BitcoinCompletoWrapper = React.lazy(() => import("@/componentes/charts/BitcoinCompletoWrapper"));
const BitcoinChartWrapper = React.lazy(() => import("@/componentes/charts/BitcoinChartWrapper"));
const NewsFeed = React.lazy(() => import("@/componentes/news/news-feed"));
const TweetsFeed = React.lazy(() => import("@/componentes/tweets/tweets-feed"));

interface DashboardStats {
  totalNews: number;
  totalTweets: number;
  positiveSentiment: number;
  negativeSentiment: number;
  neutralSentiment: number;
}

const INITIAL_STATS: DashboardStats = {
  totalNews: 0,
  totalTweets: 0,
  positiveSentiment: 0,
  negativeSentiment: 0,
  neutralSentiment: 0,
};

const generateFallbackNews = () => Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  titulo: `Notícia Bitcoin ${i + 1}`,
  descricao: `Descrição da notícia sobre Bitcoin ${i + 1}`,
  sentiment: ["positive", "negative", "neutral"][i % 3],
  dataPublicacao: new Date().toISOString(),
  fonte: "Fonte de Exemplo",
}));

const generateFallbackTweets = () => Array.from({ length: 156 }, (_, i) => ({
  id: i + 1,
  text: `Tweet sobre Bitcoin ${i + 1} #BTC #Crypto`,
  usuario: `user${i + 1}`,
  sentiment: ["positive", "negative", "neutral"][i % 3],
  dataCriacao: new Date().toISOString(),
}));

export default function HomeClient() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-white text-xl">Carregando autenticação...</p>
      </div>
    );
  }

  if (!user) return null;

  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const previousStatsRef = useRef<DashboardStats | null>(null);
  const mountedRef = useRef(true);

  const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const fetchStats = useCallback(async () => {
    if (!mountedRef.current) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      setIsLoading(true);

      if (!API_URL) {
        console.warn("API não configurada. Usando dados de exemplo.");
        showToast("warning", "Modo Offline", "Exibindo dados de demonstração.", 5000);

        const fallback = {
          totalNews: 24,
          totalTweets: 156,
          positiveSentiment: 48,
          negativeSentiment: 22,
          neutralSentiment: 30,
        };

        previousStatsRef.current = fallback;
        setStats(fallback);
        setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
        return;
      }

      const [newsRes, tweetsRes] = await Promise.allSettled([
        fetch(buildApiUrl("noticias/ultimas?limit=50&q=bitcoin"), { signal: controller.signal }),
        fetch(buildApiUrl("noticias/tweets/ultimos?limit=50&q=bitcoin"), { signal: controller.signal }),
      ]);

      const newsItems = newsRes.status === "fulfilled" && newsRes.value.ok
        ? (await newsRes.value.json()).data || []
        : generateFallbackNews();

      const tweetItems = tweetsRes.status === "fulfilled" && tweetsRes.value.ok
        ? (await tweetsRes.value.json()).data || []
        : generateFallbackTweets();

      const allItems = [...newsItems, ...tweetItems];
      const sentimentCounts = allItems.reduce((acc, item) => {
        const s = (item.sentimento || item.sentiment || "neutral").toLowerCase();
        if (s.includes("pos")) acc.positive++;
        else if (s.includes("neg")) acc.negative++;
        else acc.neutral++;
        return acc;
      }, { positive: 0, negative: 0, neutral: 0 });

      const total = allItems.length || 1;
      const newStats = {
        totalNews: newsItems.length,
        totalTweets: tweetItems.length,
        positiveSentiment: Math.round((sentimentCounts.positive / total) * 100),
        negativeSentiment: Math.round((sentimentCounts.negative / total) * 100),
        neutralSentiment: Math.round((sentimentCounts.neutral / total) * 100),
      };

      if (previousStatsRef.current) {
        const diffPos = Math.abs(newStats.positiveSentiment - previousStatsRef.current.positiveSentiment);
        const diffNeg = Math.abs(newStats.negativeSentiment - previousStatsRef.current.negativeSentiment);
        if (diffPos > 12) showToast("success", "Positivo em Alta", `+${diffPos}%`);
        if (diffNeg > 12) showToast("warning", "Negativo em Alta", `+${diffNeg}%`);
      }

      previousStatsRef.current = newStats;
      setStats(newStats);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));

    } catch (err: any) {
      console.error("Erro:", err);
      showToast("error", "Erro", getFetchErrorMessage(err));
      setStats({
        totalNews: 24,
        totalTweets: 156,
        positiveSentiment: 45,
        negativeSentiment: 25,
        neutralSentiment: 30,
      });
    } finally {
      clearTimeout(timeoutId);
      if (mountedRef.current) setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchStats]);

  const handleManualRefresh = useCallback(() => {
    fetchStats();
    showToast("info", "Atualizando", "Buscando dados...", 2000);
  }, [fetchStats]);

  const sentimentBadges = useMemo(() => (
    <div className="flex flex-wrap items-center gap-3">
      <SentimentBadge sentiment="positive" score={stats.positiveSentiment / 100} count={stats.positiveSentiment} showTrend />
      <SentimentBadge sentiment="negative" score={stats.negativeSentiment / 100} count={stats.negativeSentiment} showTrend />
      <SentimentBadge sentiment="neutral" score={stats.neutralSentiment / 100} count={stats.neutralSentiment} />
    </div>
  ), [stats]);

  return (
    <ErrorBoundary
  errorComponent={() => (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
      <div className="bg-neutral-900 border border-red-500/50 rounded-2xl p-10 text-center max-w-lg shadow-2xl">
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-red-400 mb-2">Erro no Dashboard</h2>
          <p className="text-gray-300 text-lg">
            Ocorreu um problema ao carregar o painel. Vamos resolver isso agora!
          </p>
        </div>
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-xl transition transform hover:scale-105 shadow-lg"
          >
            Recarregar Página
          </button>
          <p className="text-gray-500 text-sm">
            Ou tente novamente em alguns segundos...
          </p>
        </div>
      </div>
    </div>
  )}
>
 
  <div className="min-h-screen bg-neutral-950 text-white">
    <Header />
    <StatusBar />
    <ToastNotifier />

    <div className="p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Bitcoin</h1>
          <p className="text-gray-400 mt-2">
            Análise de sentimento em tempo real
            {lastUpdate && <span className="text-gray-500 text-sm ml-2">• Atualizado: {lastUpdate}</span>}
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-70 transition font-medium"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          {isLoading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 p-4 bg-neutral-900 rounded-lg border border-neutral-800">
        <span className="text-gray-400 text-sm whitespace-nowrap">Sentimento Geral:</span>
        {sentimentBadges}
      </div>

      <Suspense fallback={<div className="h-32 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
        <BitcoinPriceClient />
      </Suspense>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
        <StatsCard title="Notícias" value={isLoading ? "..." : stats.totalNews.toString()} change={8.2} icon={<Newspaper size={24} />} sentiment="positive" />
        <StatsCard title="Tweets" value={isLoading ? "..." : stats.totalTweets.toString()} change={15.7} icon={<Twitter size={24} />} sentiment="positive" />
        <StatsCard title="Positivo" value={isLoading ? "..." : `${stats.positiveSentiment}%`} change={2.5} icon={<TrendingUp size={24} />} sentiment="positive" />
        <StatsCard title="Negativo" value={isLoading ? "..." : `${stats.negativeSentiment}%`} change={-1.2} icon={<TrendingDown size={24} />} sentiment="negative" />
      </div>

      <Suspense fallback={<div className="h-48 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
        <Recomendacoes />
      </Suspense>

      <div className="my-12">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="text-yellow-400" size={28} />
          <h2 className="text-2xl font-bold">Análise de Sentimento</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Suspense fallback={<div className="h-80 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
            <SentimentChart />
          </Suspense>
          <Suspense fallback={<div className="h-80 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
            <SentimentDistribution distribution={{
              positive: stats.positiveSentiment,
              negative: stats.negativeSentiment,
              neutral: stats.neutralSentiment,
            }} />
          </Suspense>
        </div>
      </div>

      <div className="my-12">
        <Suspense fallback={<div className="h-96 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
          <PriceChartSafe />
        </Suspense>
      </div>

      <div className="my-12">
        <Suspense fallback={<div className="h-96 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
          <BitcoinCompletoWrapper />
        </Suspense>
      </div>

      <div className="my-12">
        <Suspense fallback={<div className="h-96 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
          <BitcoinChartWrapper />
        </Suspense>
      </div>

      <div className="my-8">
        <Suspense fallback={<div className="h-24 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
          <LegendaSentimentos />
        </Suspense>
      </div>

      <div className="my-12">
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-48 animate-pulse" />
            ))}
          </div>
        }>
          <NewsFeed />
        </Suspense>
      </div>

      <div className="my-12">
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-48 animate-pulse" />
            ))}
          </div>
        }>
          <TweetsFeed />
        </Suspense>
      </div>
    </div>
  </div>
</ErrorBoundary>
  );
}