// componentes/tweets/TweetsFeedContent.tsx
"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
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

export default function TweetsFeedContent() {
  const [tweets, setTweets] = useState<TweetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://fallback.example.com";

  const fetchTweets = async () => {
    if (!API_BASE_URL || API_BASE_URL.includes("fallback")) {
      setTweets(generateFallbackTweets());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(buildApiUrl("noticias/tweets/ultimos?limit=10&q=bitcoin"));
      if (!res.ok) throw new Error("Falha na API");
      const json = await res.json();
      setTweets(json.data || []);
    } catch (err) {
      setError("Erro ao carregar tweets");
      setTweets(generateFallbackTweets());
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackTweets = (): TweetItem[] => [
    {
      title: "Bitcoin rompe $70k com força!",
      description: "ETF da BlackRock registra maior volume da história. Touros dominam.",
      url: "#",
      source: "@crypto_king",
      publishedAt: new Date().toISOString(),
      sentimento: "positive",
      score: 0.94,
      tweet: true,
      tweetUrl: "https://twitter.com/crypto_king/status/123"
    },
    {
      title: "FUD: Regulador pode banir staking",
      description: "Notícia falsa espalhada por conta hackeada. Comunidade em alerta.",
      url: "#",
      source: "@bear_whisperer",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      sentimento: "negative",
      score: 0.78,
      tweet: true
    }
  ];

  useEffect(() => {
    fetchTweets();
  }, []);

  if (error && tweets.length === 0) {
    return (
      <div className="text-center py-12 text-red-400">
        {error}
        <button onClick={fetchTweets} className="ml-4 bg-yellow-500 text-black px-4 py-2 rounded">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {tweets.map((tweet, i) => {
        const { publishedAt, sentimento, ...rest } = tweet;
        return (
          <NewsCard
            key={i}
            {...rest}
            date={publishedAt}  // ← ESSA LINHA RESOLVE TUDO
            sentiment={sentimento as "positive" | "negative" | "neutral"}
            isTweet
          />
        );
      })}
    </div>
  );
}