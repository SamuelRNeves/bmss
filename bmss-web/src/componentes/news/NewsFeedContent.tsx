// componentes/news/NewsFeedContent.tsx
"use client";

import { useEffect, useState } from "react";
import { NewsCard } from "./news-card";
import { buildApiUrl, getFetchErrorMessage } from "@/lib/api";

export default function NewsFeedContent() {
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://fallback-api.example.com";

  const fetchNews = async () => {
    if (!API_BASE_URL) {
      setNews(generateFallbackNews());
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(buildApiUrl("noticias/ultimas?limit=10&q=bitcoin"));
      if (res.ok) {
        const data = await res.json();
        setNews(data.data || []);
      }
    } catch (err) {
      setNews(generateFallbackNews());
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackNews = () => [
    {
      title: "Bitcoin atinge nova máxima histórica",
      description: "Preço supera $73.000 com entrada de institucionais.",
      source: "CoinDesk",
      publishedAt: new Date().toISOString(),
      sentimento: "positive",
      score: 0.95,
      url: "#",
      tweet: false
    }
  ];

  useEffect(() => {
    fetchNews();
  }, []);

  if (isLoading) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {news.map((item, i) => (
        <NewsCard key={i} {...item} sentiment={item.sentimento as any} />
      ))}
    </div>
  );
}