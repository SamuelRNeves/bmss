"use client";

import React, { useEffect, useState } from "react";
import { getFeed } from "../lib/api";
import { Twitter, RefreshCw } from "lucide-react";

interface TweetItem {
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

export default function TweetsList() {
  const [tweets, setTweets] = useState<TweetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [filter, setFilter] = useState<"all" | "positive" | "neutral" | "negative">("all");

  async function fetchTweets(analyze = true) {
    setLoading(true);
    const { data, isFallback } = await getFeed("tweets", 20, "bitcoin", analyze);
    setTweets(data || []);
    setIsFallback(isFallback);
    setLoading(false);
  }

  async function handleReanalyze() {
    setAnalyzing(true);
    await fetchTweets(true);
    setAnalyzing(false);
  }

  useEffect(() => {
    fetchTweets(true);
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

  const filteredTweets =
    filter === "all" ? tweets : tweets.filter((t) => t.sentimento === filter);

  return (
    <section className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold text-gray-100">🐦 Últimos Tweets</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReanalyze}
            disabled={analyzing}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              analyzing
                ? "bg-gray-700 text-gray-300 cursor-wait"
                : "bg-sky-600 hover:bg-sky-700 text-white"
            }`}
          >
            <RefreshCw size={16} className={analyzing ? "animate-spin" : ""} />
            {analyzing ? "Analisando..." : "Analisar Tweets"}
          </button>
        </div>
      </div>

      {/* Botões de filtro */}
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

      {/* Lista de Tweets */}
      {loading ? (
        <div className="text-gray-400 text-center py-4">Carregando tweets...</div>
      ) : filteredTweets.length === 0 ? (
        <div className="text-gray-400 text-center py-4">
          Nenhum tweet encontrado para esse filtro.
        </div>
      ) : (
        filteredTweets.map((item, index) => {
          const style = getSentimentStyle(item.sentimento);
          const link = item.tweetUrl || item.url;
          return (
            <div
              key={item.id || index}
              className={`p-4 bg-neutral-900 border-2 ${style.border} rounded-lg hover:bg-neutral-800 transition-colors`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Twitter className="text-sky-400" size={18} />
                <h3 className="text-gray-100 font-semibold">
                  {item.title || "Tweet"}
                </h3>
              </div>

              <p className="text-gray-400 text-sm mb-2">{item.description}</p>

              <p className="text-gray-500 text-xs">
                <strong>Sentimento:</strong>{" "}
                <span className={style.text}>{style.label}</span>{" "}
                {typeof item.score === "number" && `(${item.score.toFixed(3)})`}
              </p>

              {item.publishedAt && (
                <p className="text-gray-500 text-xs">
                  <strong>Publicado:</strong>{" "}
                  {new Date(item.publishedAt).toLocaleString("pt-BR")}
                </p>
              )}

              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-400 text-sm mt-3 hover:text-sky-300"
                >
                  Abrir no X
                  <Twitter size={14} className="text-sky-400" />
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
