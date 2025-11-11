"use client";

import { useCallback, useEffect, useState } from "react";
import { NewsCard } from "./news-card";
import { buildApiUrl, getFetchErrorMessage } from "@/lib/api";

type Sentiment = "positive" | "neutral" | "negative";

interface NewsItem {
  title: string;
  description: string;
  source: string;
  date: string;
  sentiment: Sentiment;
  score: number;
  url: string;
  isTweet: boolean;
  tweetUrl?: string;
}

const sentimentMap: Record<string, Sentiment | "todos"> = {
  positivo: "positive",
  negativo: "negative",
  neutro: "neutral",
  todos: "todos",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeSentiment = (value: unknown): Sentiment => {
  if (typeof value !== "string") return "neutral";

  const normalized = value.toLowerCase();

  switch (normalized) {
    case "positive":
    case "positivo":
      return "positive";
    case "negative":
    case "negativo":
      return "negative";
    default:
      return "neutral";
  }
};

const createFallbackNews = (): NewsItem[] => [
  {
    title: "Bitcoin atinge nova máxima histórica",
    description: "Preço supera $73.000 com entrada de institucionais.",
    source: "CoinDesk",
    date: new Date().toISOString(),
    sentiment: "positive",
    score: 0.95,
    url: "#",
    isTweet: false,
    tweetUrl: undefined,
  },
];

const toNewsItem = (item: unknown): NewsItem => {
  if (!isRecord(item)) {
    return createFallbackNews()[0];
  }

  const data = item as Record<string, unknown>;

  const getString = (field: string): string | undefined => {
    const value = data[field];
    return typeof value === "string" ? value : undefined;
  };

  const scoreValue = data.score;
  const isTweetValue = data.isTweet;

  return {
    title: getString("title") ?? "",
    description: getString("description") ?? "",
    source: getString("source") ?? "",
    date: getString("publishedAt") ?? getString("date") ?? new Date().toISOString(),
    sentiment: normalizeSentiment(data["sentimento"] ?? data["sentiment"]),
    score: typeof scoreValue === "number" ? scoreValue : Number(scoreValue) || 0,
    url: getString("url") ?? "",
    isTweet: typeof isTweetValue === "boolean" ? isTweetValue : Boolean(isTweetValue),
    tweetUrl: getString("tweetUrl"),
  };
};

export default function NewsFeedContent() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState("todos");

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    try {
      // ✅ Converte o filtro antes de enviar à API
      const mappedFilter = sentimentMap[sentimentFilter] || sentimentFilter;

      const endpoint =
        mappedFilter === "todos"
          ? buildApiUrl("noticias/ultimas?limit=10&q=bitcoin")
          : buildApiUrl(`noticias/filtrar?sentiment=${mappedFilter}&limit=10`);

      const res = await fetch(endpoint);
      const data = await res.json();
      const items: NewsItem[] = Array.isArray(data?.data)
        ? data.data.map(toNewsItem)
        : [];

      setNews(items);
    } catch (err) {
      console.error("Erro ao buscar notícias:", getFetchErrorMessage(err));
      setNews(createFallbackNews());
    } finally {
      setIsLoading(false);
    }
  }, [sentimentFilter]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  if (isLoading) {
    return (
      <div className="text-gray-400 text-center py-6">
        Carregando notícias...
      </div>
    );
  }

  return (
    <div>
      {/* 🔹 Filtro de Sentimento */}
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
            <NewsCard
              key={i}
              title={item.title}
              description={item.description}
              source={item.source}
              date={item.date}
              sentiment={item.sentiment}
              score={item.score}
              url={item.url}
              isTweet={item.isTweet}
              tweetUrl={item.tweetUrl}
            />
          ))
        ) : (
          <p className="text-gray-400 text-center">
            Nenhuma notícia encontrada.
          </p>
        )}
      </div>
    </div>
  );
}
