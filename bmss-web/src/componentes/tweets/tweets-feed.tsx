"use client";

import { useEffect, useState } from "react";
import { NewsCard } from "../news/news-card";
import { RefreshCw, Twitter } from "lucide-react";

interface TweetItem {
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

export function TweetsFeed() {
  const [tweets, setTweets] = useState<TweetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? "http://localhost:8080/api/v1" : undefined);

  const fetchTweets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!API_BASE_URL) {
        throw new Error("API base URL não configurada");
      }

      const response = await fetch(`${API_BASE_URL}/noticias/tweets/ultimos?limit=10&q=bitcoin`);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      setTweets(data.data || []);
      
    } catch (error) {
      console.error('Erro ao buscar tweets:', error);
      setError('Erro ao carregar tweets');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeTweets = async () => {
    try {
      if (!API_BASE_URL) {
        throw new Error("API base URL não configurada");
      }

      const response = await fetch(`${API_BASE_URL}/noticias/analisar-tweets?q=bitcoin`, {
        method: 'POST'
      });

      if (response.ok) {
        setTimeout(fetchTweets, 3000);
        alert('Análise de tweets iniciada!');
      }
    } catch (error) {
      console.error('Erro ao iniciar análise de tweets:', error);
    }
  };

  useEffect(() => {
    fetchTweets();
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
      
<h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
  <Twitter className="text-blue-400" size={24} />
  Tweets Analisados
</h2>
<p className="text-gray-400 mb-4">
  {tweets.length} tweets monitorados • Atualizado em {new Date().toLocaleTimeString('pt-BR')}
</p>
        <div className="flex gap-2">
          <button
            onClick={analyzeTweets}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Buscar Tweets
          </button>
          <button
            onClick={fetchTweets}
            className="bg-neutral-700 text-white px-4 py-2 rounded-lg hover:bg-neutral-600 transition-colors"
          >
            Atualizar
          </button>
        </div>
      </div>

      {tweets.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          Nenhum tweet encontrado. Clique em "Buscar Tweets" para analisar tweets em tempo real.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tweets.map((tweet, index) => (
            <NewsCard
              key={index}
              title={tweet.title}
              description={tweet.description}
              source={tweet.source}
              date={tweet.publishedAt}
              sentiment={tweet.sentimento as "positive" | "negative" | "neutral"}
              score={tweet.score}
              url={tweet.url}
              isTweet={true}
              tweetUrl={tweet.tweetUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}