"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { getUltimasNoticias } from "../lib/api";
import { ExternalLink } from "lucide-react";
import axios from "axios";

interface NewsItem {
  id?: string | number;
  title: string;
  description: string;
  url?: string;
  fonte?: string;
  publishedAt?: string;
  sentimento?: string;
  score?: number;
  category?: { name: string };
}

export default function NewsList() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const categorias = [
    "bitcoin",
    "política",
    "economia",
    "geopolítica",
    "mercado financeiro",
    "tecnologia",
  ];

  // 🔹 Busca do backend local paginado
  const fetchLocalNews = async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `http://localhost:8080/api/v1/noticias/todas?page=${pageNum}&size=10`
      );
      if (res.data.length === 0) {
        setHasMore(false);
      } else {
        setNews((prev) => [...prev, ...res.data]);
      }
    } catch (error) {
      console.error("Erro ao buscar notícias locais:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Scroll infinito
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loading) {
        setPage((prev) => prev + 1);
      }
    },
    [hasMore, loading]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    fetchLocalNews(page);
  }, [page]);

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
      <h2 className="text-xl font-semibold text-gray-200 text-center mb-4">
        📰 Últimas Notícias de Todas as Categorias
      </h2>

      {news.map((item, index) => {
        const style = getSentimentStyle(item.sentimento);
        return (
          <div
          key={`${item.url || item.title || "sem-url"}-${index}`}

            className={`p-4 bg-neutral-900 border-2 ${style.border} rounded-lg hover:bg-neutral-800 transition-colors`}
          >
            {/* Categoria */}
            {item.category?.name && (
              <span className="inline-block mb-2 px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-800 text-yellow-400 uppercase">
                {item.category.name}
              </span>
            )}

            {/* Título */}
            <h3 className="text-lg font-semibold text-gray-100 mb-1">
              {item.title || "Título não informado"}
            </h3>

            {/* Descrição */}
            <p className="text-gray-400 text-sm mb-2 line-clamp-3">
              {item.description || "Sem descrição disponível."}
            </p>

            {/* Score */}
            {typeof item.score === "number" && (
              <p className="text-gray-500 text-xs mb-1">
                Score: {item.score.toFixed(3)}
              </p>
            )}

            {/* Rodapé */}
            <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-gray-500 mt-2">
              <span>
                <span className="text-gray-400">Fonte:</span>{" "}
                {item.fonte || "Desconhecida"}
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

            {/* Link */}
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

      {/* Loader infinito */}
      <div ref={loaderRef} className="text-center py-6 text-gray-400">
        {loading ? "Carregando mais notícias..." : hasMore ? "..." : "✅ Fim das notícias."}
      </div>
    </section>
  );
}
