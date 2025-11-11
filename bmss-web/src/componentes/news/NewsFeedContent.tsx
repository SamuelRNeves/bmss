"use client";

import { useEffect, useState } from "react";
import { NewsCard } from "./news-card";
import { buildApiUrl, getFetchErrorMessage } from "@/lib/api";

export default function NewsFeedContent() {
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState("todos");

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://bmss-backend.onrender.com/api/v1";

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const endpoint =
        sentimentFilter === "todos"
          ? buildApiUrl("noticias/ultimas?limit=10&q=bitcoin")
          : buildApiUrl(`noticias/filtrar?sentiment=${sentimentFilter}&limit=10`);

      const res = await fetch(endpoint);
      const data = await res.json();
      setNews(data.data || []);
    } catch (err) {
      console.error("Erro ao buscar notícias:", getFetchErrorMessage(err));
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
      tweet: false,
    },
  ];

  useEffect(() => {
    fetchNews();
  }, [sentimentFilter]);

  if (isLoading) {
    return (
      <div className="text-gray-400 text-center py-6">
        Carregando notícias...
      </div>
    );
  }

  return (
    <div>
      {/* Filtro de Sentimento */}
      <div className="flex justify-end mb-6">
        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 text-gray-300 rounded-lg px-3 py-2"
        >
          <option value="todos">Todas</option>
          <option value="positivo">Positivas</option>
          <option value="neutro">Neutras</option>
          <option value="negativo">Negativas</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {news.length > 0 ? (
          news.map((item, i) => (
            <NewsCard key={i} {...item} sentiment={item.sentimento as any} />
          ))
        ) : (
          <p className="text-gray-400 text-center">Nenhuma notícia encontrada.</p>
        )}
      </div>
    </div>
  );
}
