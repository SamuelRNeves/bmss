"use client";

import { useEffect, useState } from "react";
import { NewsCard } from "./news-card";
import { ExternalLink, Calendar, RefreshCw } from "lucide-react";

interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentimento: string;
  score: number;
  tweet: boolean;
  tweetUrl?: string;
}

export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? "http://localhost:8080/api/v1" : undefined);

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!API_BASE_URL) {
        throw new Error("API base URL não configurada");
      }

      const response = await fetch(`${API_BASE_URL}/noticias/ultimas?limit=10&q=bitcoin`);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      setNews(data.data || []);
      
    } catch (error) {
      console.error('Erro ao buscar notícias:', error);
      setError('Erro ao carregar notícias');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeNews = async () => {
    try {
      if (!API_BASE_URL) {
        throw new Error("API base URL não configurada");
      }

      const response = await fetch(`${API_BASE_URL}/noticias/analisar?limit=20&q=bitcoin`, {
        method: 'POST'
      });

      if (response.ok) {
        setTimeout(fetchNews, 3000);
        alert('Análise de notícias iniciada!');
      }
    } catch (error) {
      console.error('Erro ao iniciar análise:', error);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-neutral-800 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-neutral-800 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-neutral-800 rounded w-full mb-2"></div>
            <div className="h-4 bg-neutral-800 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 mb-4">❌ {error}</div>
        <button
          onClick={fetchNews}
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
      
        <h2 className="text-2xl font-bold text-white mb-2">Notícias em Tempo Real</h2>
            <p className="text-gray-400 mb-4">
            {news.length} notícias analisadas • Atualizado em {new Date().toLocaleTimeString('pt-BR')}
            </p>
        <div className="flex gap-2">
          <button
            onClick={analyzeNews}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Nova Análise
          </button>
          <button
            onClick={fetchNews}
            className="bg-neutral-700 text-white px-4 py-2 rounded-lg hover:bg-neutral-600 transition-colors"
          >
            Atualizar
          </button>
        </div>
      </div>

      {news.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          Nenhuma notícia encontrada. Clique em "Nova Análise" para buscar notícias.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {news.map((item, index) => (
            <NewsCard
              key={index}
              title={item.title}
              description={item.description}
              source={item.source}
              date={item.publishedAt}
              sentiment={item.sentimento as "positive" | "negative" | "neutral"}
              score={item.score}
              url={item.url}
              isTweet={item.tweet}
              tweetUrl={item.tweetUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}