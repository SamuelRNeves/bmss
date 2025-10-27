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
  tweetUrl?: string; 
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
        return { border: "border-green-500", text: "text-green-400", label: "Positivo" };
      case "negative":
        return { border: "border-red-500", text: "text-red-400", label: "Negativo" };
      default:
        return { border: "border-yellow-400", text: "text-yellow-400", label: "Neutro" };
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

            <p className="text-gray-500 text-xs mb-1">
              <strong>Score:</strong>{" "}
              {typeof item.score === "number" ? item.score.toFixed(3) : "—"}
              <br />
              <strong>Fonte:</strong> {item.source || "Desconhecida"}
              <br />
              <strong>Publicado:</strong>{" "}
              {item.publishedAt
                ? new Date(item.publishedAt).toLocaleString("pt-BR")
                : "Data não informada"}
              <br />
              <strong>Sentimento:</strong>{" "}
              <span className={style.text}>{style.label}</span>
              <br />
              <strong>Modelo:</strong>{" "}
              <span className="text-blue-400">
                Ensemble (Caramelo + FinBERT)
              </span>
            </p>

            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 text-sm mt-3 hover:text-blue-300 transition-colors"
              >
                Ler notícia completa
                <p className="text-xs text-gray-500">
                Fonte: {item.source || "Desconhecida"}
                </p>
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
