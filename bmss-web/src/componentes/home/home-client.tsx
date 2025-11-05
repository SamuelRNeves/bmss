"use client";

import { BitcoinPriceSafe } from "@/componentes/BitcoinPriceSafe";
import { StatsCard } from "@/componentes/dashboard/stats-cards";
import { SentimentChart } from "@/componentes/charts/sentiment-chart";
import { SentimentDistribution } from "@/componentes/charts/sentiment-distribution";
import { NewsFeed } from "@/componentes/news/news-feed";
import { TweetsFeed } from "@/componentes/tweets/tweets-feed";
import { StatusBar } from "@/componentes/status/status-bar";
import { ToastNotifier, showToast } from "@/componentes/notifications/toast-notifier";
import { SentimentBadge } from "@/componentes/status/sentiment-badge";
import { Newspaper, TrendingUp, TrendingDown, Twitter, BarChart3, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import BitcoinHistoricoCompleto from "../charts/BitcoinHistoricoCompleto";
import PriceChartSafe from "../charts/PriceChartSafe";
import BitcoinHistoricoChart from "../charts/BitcoinHistoricoChart";

interface NewsItem {
  id: number;
  titulo: string;
  descricao: string;
  sentiment: string;
  sentimento?: string;
  dataPublicacao: string;
  fonte: string;
}

interface TweetItem {
  id: number;
  text: string;
  usuario: string;
  sentiment: string;
  sentimento?: string;
  dataCriacao: string;
}

interface ApiResponse<T> {
  data: T[];
  success: boolean;
  message?: string;
}

export default function HomeClient() {
  const [stats, setStats] = useState({
    totalNews: 0,
    totalTweets: 0,
    positiveSentiment: 0,
    negativeSentiment: 0,
    neutralSentiment: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

const fetchStats = async () => {
  try {
    setIsLoading(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const [newsResponse, tweetsResponse] = await Promise.allSettled([
      fetch(`${API_URL}/noticias/ultimas?limit=50&q=bitcoin`, {
        signal: controller.signal
      }),
      fetch(`${API_URL}/noticias/tweets/ultimos?limit=50&q=bitcoin`, {
        signal: controller.signal
      })
    ]);


      clearTimeout(timeoutId);

      let newsItems: NewsItem[] = [];
      let tweetItems: TweetItem[] = [];

      if (newsResponse.status === 'fulfilled' && newsResponse.value.ok) {
        const newsData: ApiResponse<NewsItem> = await newsResponse.value.json();
        newsItems = newsData.data || [];
      } else {
        console.warn('Falha ao carregar notícias, usando fallback');
        newsItems = generateFallbackNews();
      }

      if (tweetsResponse.status === 'fulfilled' && tweetsResponse.value.ok) {
        const tweetsData: ApiResponse<TweetItem> = await tweetsResponse.value.json();
        tweetItems = tweetsData.data || [];
      } else {
        console.warn('Falha ao carregar tweets, usando fallback');
        tweetItems = generateFallbackTweets();
      }

      const allItems = [...newsItems, ...tweetItems];

      const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
      
      allItems.forEach(item => {
        const sentiment = item.sentimento || item.sentiment || 'neutral';
        
        if (sentiment === 'positive' || sentiment === 'positivo') sentimentCounts.positive++;
        else if (sentiment === 'negative' || sentiment === 'negativo') sentimentCounts.negative++;
        else sentimentCounts.neutral++;
      });

      const totalItems = allItems.length;
      const positivePercentage = totalItems > 0 ? (sentimentCounts.positive / totalItems) * 100 : 0;
      const negativePercentage = totalItems > 0 ? (sentimentCounts.negative / totalItems) * 100 : 0;
      const neutralPercentage = totalItems > 0 ? (sentimentCounts.neutral / totalItems) * 100 : 0;

      setStats({
        totalNews: newsItems.length,
        totalTweets: tweetItems.length,
        positiveSentiment: Math.round(positivePercentage),
        negativeSentiment: Math.round(negativePercentage),
        neutralSentiment: Math.round(neutralPercentage)
      });

      setLastUpdate(new Date().toLocaleTimeString('pt-BR'));

      if (positivePercentage > 60 && totalItems > 10) {
        showToast('success', 'Sentimento Positivo Alto', `${Math.round(positivePercentage)}% das notícias são positivas`);
      } else if (negativePercentage > 50 && totalItems > 10) {
        showToast('warning', 'Alerta de Negatividade', `${Math.round(negativePercentage)}% das notícias são negativas`);
      }

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      
      setStats({
        totalNews: 24,
        totalTweets: 156,
        positiveSentiment: 42,
        negativeSentiment: 28,
        neutralSentiment: 30
      });
      
      showToast('error', 'Erro de Conexão', 'Usando dados de exemplo. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackNews = (): NewsItem[] => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i + 1,
      titulo: `Notícia Bitcoin ${i + 1}`,
      descricao: `Descrição da notícia sobre Bitcoin ${i + 1}`,
      sentiment: ['positive', 'negative', 'neutral'][i % 3] as string,
      dataPublicacao: new Date().toISOString(),
      fonte: 'Fallback Source'
    }));
  };

  const generateFallbackTweets = (): TweetItem[] => {
    return Array.from({ length: 156 }, (_, i) => ({
      id: i + 1,
      text: `Tweet sobre Bitcoin ${i + 1} #BTC #Crypto`,
      usuario: `user${i + 1}`,
      sentiment: ['positive', 'negative', 'neutral'][i % 3] as string,
      dataCriacao: new Date().toISOString()
    }));
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    fetchStats();
    showToast('info', 'Atualizando', 'Buscando dados mais recentes...', 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <StatusBar />
      <ToastNotifier />
      
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard Bitcoin</h1>
            <p className="text-gray-400 mt-2">
              Análise de sentimento em tempo real
              {lastUpdate && (
                <span className="text-gray-500 text-sm ml-2">
                  • Atualizado: {lastUpdate}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 disabled:bg-yellow-600 transition-colors"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        {/* Resumo de Sentimentos */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 p-4 bg-neutral-900 rounded-lg">
          <span className="text-gray-400 text-sm whitespace-nowrap">Sentimento Geral:</span>
          <div className="flex flex-wrap items-center gap-3">
            <SentimentBadge 
              sentiment="positive" 
              score={stats.positiveSentiment / 100}
              count={stats.positiveSentiment}
              showTrend
            />
            <SentimentBadge 
              sentiment="negative" 
              score={stats.negativeSentiment / 100}
              count={stats.negativeSentiment}
              showTrend
            />
            <SentimentBadge 
              sentiment="neutral" 
              score={stats.neutralSentiment / 100}
              count={stats.neutralSentiment}
            />
          </div>
        </div>

        {/* Preço do Bitcoin */}
        <div className="mb-8">
          <BitcoinPriceSafe />
        </div>

        {/* ✅ CORREÇÃO: Removida a propriedade isLoading dos StatsCard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Notícias Analisadas"
            value={isLoading ? "..." : stats.totalNews.toLocaleString('pt-BR')}
            change={8.2}
            icon={<Newspaper size={24} />}
            sentiment="positive"
          />
          <StatsCard
            title="Tweets Monitorados"
            value={isLoading ? "..." : stats.totalTweets.toLocaleString('pt-BR')}
            change={15.7}
            icon={<Twitter size={24} />}
            sentiment="positive"
          />
          <StatsCard
            title="Sentimento Positivo"
            value={isLoading ? "..." : `${stats.positiveSentiment}%`}
            change={2.5}
            icon={<TrendingUp size={24} />}
            sentiment="positive"
          />
          <StatsCard
            title="Sentimento Negativo"
            value={isLoading ? "..." : `${stats.negativeSentiment}%`}
            change={-1.2}
            icon={<TrendingDown size={24} />}
            sentiment="negative"
          />
        </div>

        {/* Gráficos de Sentimento */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-yellow-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Análise de Sentimento</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <SentimentChart />
            <SentimentDistribution 
              distribution={{
                positive: stats.positiveSentiment,
                negative: stats.negativeSentiment,
                neutral: stats.neutralSentiment
              }}
            />
          </div>
        </div>

        {/* Gráficos de Preço */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-yellow-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Análise de Preço</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            <PriceChartSafe />
          </div>
        </div>

        {/* Histórico Completo */}
        <div className="mb-8">
          <BitcoinHistoricoCompleto />
        </div>

        {/* Histórico Interativo */}
        <div className="mb-12">
          <BitcoinHistoricoChart />
        </div>

        {/* Feed de Notícias */}
        <div className="mb-12">
          <NewsFeed />
        </div>

        {/* Feed de Tweets */}
        <div className="mb-8">
          <TweetsFeed />
        </div>
      </div>
    </div>
  );
}