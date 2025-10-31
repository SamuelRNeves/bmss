"use client";

import { BitcoinPrice } from "@/componentes/crypto/bitcoin-price";
import { StatsCard } from "@/componentes/dashboard/stats-cards";
import { SentimentChart } from "@/componentes/charts/sentiment-chart";
import { SentimentDistribution } from "@/componentes/charts/sentiment-distribution";
import { PriceChart } from "@/componentes/charts/price-chart";
import { NewsFeed } from "@/componentes/news/news-feed";
import { TweetsFeed } from "@/componentes/tweets/tweets-feed";
import { StatusBar } from "@/componentes/status/status-bar";
import { ToastNotifier, showToast } from "@/componentes/notifications/toast-notifier";
import { SentimentBadge } from "@/componentes/status/sentiment-badge";
import { Newspaper, TrendingUp, TrendingDown, Twitter, BarChart3, RefreshCw, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import BitcoinHistoricoChart from "../charts/BitcoinHistoricoChart";
import BitcoinHistoricoCompleto from "../charts/BitcoinHistoricoCompleto";
import BitcoinPriceSafe from "../BitcoinPriceSafe";
import PriceChartSafe from "../charts/PriceChartSafe";

export default function HomeClient() {
  const [stats, setStats] = useState({
    totalNews: 0,
    totalTweets: 0,
    positiveSentiment: 0,
    negativeSentiment: 0,
    neutralSentiment: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      
      const [newsResponse, tweetsResponse] = await Promise.all([
        fetch('http://localhost:8080/api/v1/noticias/ultimas?limit=50&q=bitcoin'),
        fetch('http://localhost:8080/api/v1/noticias/tweets/ultimos?limit=50&q=bitcoin')
      ]);

      const newsData = await newsResponse.json();
      const tweetsData = await tweetsResponse.json();

      const newsItems = newsData.data || [];
      const tweetItems = tweetsData.data || [];
      const allItems = [...newsItems, ...tweetItems];

      // Calcular estatísticas
      const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
      allItems.forEach(item => {
        if (item.sentimento === 'positive') sentimentCounts.positive++;
        else if (item.sentimento === 'negative') sentimentCounts.negative++;
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

      // Mostrar toast se houve mudança significativa
      if (positivePercentage > 60) {
        showToast('success', 'Sentimento Positivo Alto', `${Math.round(positivePercentage)}% das notícias são positivas`);
      } else if (negativePercentage > 50) {
        showToast('warning', 'Alerta de Negatividade', `${Math.round(negativePercentage)}% das notícias são negativas`);
      }

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      showToast('error', 'Erro de Conexão', 'Não foi possível carregar os dados mais recentes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
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
        {/* Header Limpo */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard Bitcoin</h1>
            <p className="text-gray-400 mt-2">
              Análise de sentimento em tempo real
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>

        {/* Resumo Rápido de Sentimentos */}
        <div className="flex items-center gap-4 mb-8 p-4 bg-neutral-900 rounded-lg">
          <span className="text-gray-400 text-sm">Sentimento Geral:</span>
          <div className="flex items-center gap-3">
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

        {/* Conteúdo Principal (mantido igual) */}
        <div className="mb-8">
          <BitcoinPriceSafe />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Notícias Analisadas"
            value={stats.totalNews.toLocaleString('pt-BR')}
            change={8.2}
            icon={<Newspaper size={24} />}
            sentiment="positive"
          />
          <StatsCard
            title="Tweets Monitorados"
            value={stats.totalTweets.toLocaleString('pt-BR')}
            change={15.7}
            icon={<Twitter size={24} />}
            sentiment="positive"
          />
          <StatsCard
            title="Sentimento Positivo"
            value={`${stats.positiveSentiment}%`}
            change={12.5}
            icon={<TrendingUp size={24} />}
            sentiment="positive"
          />
          <StatsCard
            title="Sentimento Negativo"
            value={`${stats.negativeSentiment}%`}
            change={-3.2}
            icon={<TrendingDown size={24} />}
            sentiment="negative"
          />
        </div>



 




        {/* Gráficos e Conteúdo */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-yellow-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Análises Gráficas</h2>
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
          
          <div className="grid grid-cols-1 gap-8">
          <PriceChartSafe />

          </div>
        </div>


       
    <BitcoinHistoricoCompleto className="mt-6" />

            <br />
        <div className="mb-12">
          <NewsFeed />
        </div>

        <div className="mb-8">
          <TweetsFeed />
        </div>
      </div>
    </div>
  );
}