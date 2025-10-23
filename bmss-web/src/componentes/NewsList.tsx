"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getUltimasNoticias } from "../lib/api";
import { ExternalLink } from "lucide-react"; // 👈 Ícone de seta externa

interface NewsItem {
  id?: string | number;
  title: string;
  description: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  sentimento?: string;
  score?: number;
}

const normalizeNewsList = (payload: unknown): NewsItem[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const rawScore = record.score;
      let score: number | undefined;

      if (typeof rawScore === "number") {
        score = rawScore;
      } else if (typeof rawScore === "string") {
        const parsed = Number(rawScore);
        score = Number.isFinite(parsed) ? parsed : undefined;
      }

      const title = typeof record.title === "string" ? record.title : "";
      const description =
        typeof record.description === "string" ? record.description : "";

      if (!title && !description) {
        return null;
      }

      return {
        id: record.id as string | number | undefined,
        title,
        description,
        url: typeof record.url === "string" ? record.url : undefined,
        source: typeof record.source === "string" ? record.source : undefined,
        publishedAt:
          typeof record.publishedAt === "string"
            ? record.publishedAt
            : undefined,
        sentimento:
          typeof record.sentimento === "string"
            ? record.sentimento
            : undefined,
        score,
      } as NewsItem;
    })
    .filter((item): item is NewsItem => Boolean(item))
    .sort((a, b) => {
      const dateA = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const dateB = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return dateB - dateA;
    });
};

export default function NewsList() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const updateNews = useCallback((payload: unknown) => {
    const normalized = normalizeNewsList(payload);
    setNews(normalized);
  }, []);

  useEffect(() => {
    getUltimasNoticias()
      .then((data) => updateNews(data))
      .catch((err) => console.error("Erro ao carregar notícias:", err))
      .finally(() => setLoading(false));
  }, [updateNews]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<unknown>;
      updateNews(customEvent.detail);
      setLoading(false);
    };

    window.addEventListener("news-updated", handler as EventListener);
    return () =>
      window.removeEventListener("news-updated", handler as EventListener);
  }, [updateNews]);

  if (loading) {
    return (
      <div className="text-gray-400 text-center py-4">
        Carregando notícias...
      </div>
    );
  }

  if (!news.length) {
    return (
      <div className="text-gray-400 text-center py-4">
        Nenhuma notícia encontrada.
      </div>
    );
  }

  // Define a cor da borda e do texto conforme o sentimento
  const getSentimentStyle = (sentimento?: string) => {
    switch (sentimento) {
      case "positive":
        return { border: "border-green-500", text: "text-green-400" };
      case "negative":
        return { border: "border-red-500", text: "text-red-400" };
      default:
        return { border: "border-yellow-400", text: "text-yellow-400" };
    }
  };

  return (
    <section className="space-y-4">
      {news.map((item, index) => {
        const style = getSentimentStyle(item.sentimento);

        return (
          <div
            key={item.id || index}
            className={`p-4 bg-neutral-900 border-2 ${style.border} rounded-lg hover:bg-neutral-800 transition-colors`}
          >
            {/* Título */}
            <h3 className="text-lg font-semibold text-gray-100 mb-1">
              {item.title || "Título não informado"}
            </h3>

            {/* Descrição */}
            <p className="text-gray-400 text-sm mb-2 line-clamp-3">
              {item.description || "Sem descrição disponível."}
            </p>

            {/* Pontuação */}
            {typeof item.score === "number" && (
              <p className="text-gray-500 text-xs mb-1">
                Score: {item.score.toFixed(3)}
              </p>
            )}

           {/* Rodapé */}
<div className="flex flex-col sm:flex-row sm:justify-between text-xs text-gray-500 mt-2">
  <span>
    <span className="text-gray-400">Fonte:</span>{" "}
    {item.source || "Desconhecida"}
  </span>

  <span>
    <span className="text-gray-400">Publicado:</span>{" "}
    {item.publishedAt
      ? new Date(item.publishedAt).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Data não informada"}
  </span>

  <span>
    <span className="text-gray-400">Sentimento:</span>{" "}
    <span className={style.text}>{item.sentimento || "neutro"}</span>
  </span>
</div>


            {/* Link com ícone ↗ */}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 text-sm mt-3 hover:text-blue-300 transition-colors"
              >
                Ler notícia completa
                <ExternalLink size={14} className="opacity-80" />
              </a>
            )}
          </div>
        );
      })}
    </section>
  );
}
