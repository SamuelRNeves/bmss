"use client";

import React, { useEffect, useState } from "react";
import { getFeed } from "../lib/api";
import { ExternalLink, RefreshCw } from "lucide-react";

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
  const [analyzing, setAnalyzing] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [filter, setFilter] = useState<"all" | "positive" | "neutral" | "negative">("all");

  async function fetchNoticias(analyze = false) {
    setLoading(true);
    const { data, isFallback } = await getFeed("news", 30, "bitcoin", analyze);
    setNews(data || []);
    setIsFallback(isFallback);
    setLoading(false);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    await fetchNoticias(true);
    setAnalyzing(false);
  }

  useEffect(() => {
    fetchNoticias();
  }, []);

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

  const filteredNews =
    filter === "all" ? news : news.filter((item) => item.sentimento === filter);

  return (
    <section className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold text-gray-100">📰 Últimas Notícias</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              analyzing
                ? "bg-gray-700 text-gray-300 cursor-wait"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <RefreshCw size={16} className={analyzing ? "animate-spin" : ""} />
            {analyzing ? "Analisando..." : "Analisar"}
          </button>
        </div>
      </div>

      {/* Filtros de sentimento */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: "Todos" },
          { key: "positive", label: "Positivos" },
          { key: "neutral", label: "Neutros" },
          { key: "negative", label: "Negativos" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all border ${
              filter === key
                ? "bg-yellow-500 text-black border-yellow-400"
                : "bg-neutral-800 border-neutral-700 text-gray-300 hover:bg-neutral-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-gray-400 text-center py-4">Carregando notícias...</div>
      ) : filteredNews.length === 0 ? (
        <div className="text-gray-400 text-center py-4">
          Nenhuma notícia encontrada para esse filtro.
        </div>
      ) : (
        filteredNews.map((item, index) => {
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
                <strong>Sentimento:</strong>{" "}
                <span className={style.text}>{style.label}</span>
                <br />
                <strong>Fonte:</strong> {item.source || "Desconhecida"}
                <br />
                <strong>Publicado:</strong>{" "}
                {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleString("pt-BR")
                  : "Data não informada"}
              </p>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 text-sm mt-3 hover:text-blue-300"
                >
                  Ler notícia completa
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          );
        })
      )}

      {isFallback && (
        <p className="text-yellow-400 text-xs text-center mt-3">
          ⚠️ Exibindo dados de cache (modo offline)
        </p>
      )}
    </section>
  );
}
