"use client";

import React, { useEffect, useState } from "react";
import { getUltimasNoticias } from "../lib/api";
import { ExternalLink } from "lucide-react";

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

export default function NewsList() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    async function fetchNoticias() {
      const { data, isFallback } = await getUltimasNoticias(30, "bitcoin");

      setNews(data || []);
      setIsFallback(isFallback);
      setLoading(false);
    }

    fetchNoticias();
  }, []);

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
            <h3 className="text-lg font-semibold text-gray-100 mb-1">
              {item.title || "Título não informado"}
            </h3>
            <p className="text-gray-400 text-sm mb-2 line-clamp-3">
              {item.description || "Sem descrição disponível."}
            </p>

            {typeof item.score === "number" && (
              <p className="text-gray-500 text-xs mb-1">
                Score: {item.score.toFixed(3)}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-gray-500 mt-2">
              <span>
                <span className="text-gray-400">Fonte:</span>{" "}
                {item.source || "Desconhecida"}
              </span>
              <span>
                <span className="text-gray-400">Publicado:</span>{" "}
                {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleString("pt-BR")
                  : "Data não informada"}
              </span>
              <span>
                <span className="text-gray-400">Sentimento:</span>{" "}
                <span className={style.text}>
                  {item.sentimento || "neutro"}
                </span>
              </span>
            </div>

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

      {isFallback && (
        <p className="text-yellow-400 text-xs text-center mt-3">
          ⚠️ Exibindo dados de cache (modo offline)
        </p>
      )}
    </section>
  );
  
}
