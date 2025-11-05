"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Twitter } from "lucide-react";
import { NewsCard } from "../news/news-card";
import { buildApiUrl, getFetchErrorMessage } from "@/lib/api";

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

  const fetchTweets = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        buildApiUrl("noticias/tweets/ultimos?limit=10&q=bitcoin"),
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      setTweets(data.data || []);
    } catch (err) {
      console.error("Erro ao buscar tweets:", err);
      setError(getFetchErrorMessage(err));
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const analyzeTweets = async () => {
    try {
      const response = await fetch(
        buildApiUrl("noticias/analisar-tweets?q=bitcoin"),
        {
          method: "POST",
        }
      );

      if (response.ok) {
        setTimeout(fetchTweets, 3000);
        alert("Análise de tweets iniciada!");
      } else {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
    } catch (err) {
      console.error("Erro ao iniciar análise de tweets:", err);
      setError(getFetchErrorMessage(err));
    }
  };

  useEffect(() => {
    fetchTweets();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 animate-pulse"
          >
            <div className="h-4 bg-neutral-800 rounded w-1/4 mb-4" />
            <div className="h-6 bg-neutral-800 rounded w-3/4 mb-2" />
            <div className="h-4 bg-neutral-800 rounded w-full mb-2" />
            <div className="h-4 bg-neutral-800 rounded w-2/3" />
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
          onClick={fetchTweets}
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Twitter className="text-blue-400" size={24} />
            Tweets Analisados
          </h2>
          <p className="text-gray-400">
            {tweets.length} tweets monitorados • Atualizado em {" "}
            {new Date().toLocaleTimeString("pt-BR")}
          </p>
        </div>
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
          Nenhum tweet encontrado. Clique em &quot;Buscar Tweets&quot; para analisar tweets em tempo real.
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
              isTweet
              tweetUrl={tweet.tweetUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
