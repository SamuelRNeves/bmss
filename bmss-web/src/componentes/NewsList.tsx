"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  NoticiasResponse,
  NewsItem,
  getUltimasNoticias,
} from "../lib/api";

export default function NewsList() {
  const [response, setResponse] = useState<NoticiasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNoticias() {
      try {
        setLoading(true);
        const data = await getUltimasNoticias(12, "bitcoin");
        setResponse(data);
        setError(null);
      } catch (err) {
        console.error("❌ Erro ao carregar notícias:", err);
        setError(err instanceof Error ? err.message : "Erro ao carregar notícias.");
        setResponse(null);
      } finally {
        setLoading(false);
      }
    }

    fetchNoticias();
  }, []);

  const news: NewsItem[] = useMemo(
    () => response?.items ?? [],
    [response]
  );

  const statusBanners = useMemo(() => {
    if (!response) return null;

    return (
      <div className="space-y-3">
        {response.message && (
          <div className="rounded-md border border-amber-500/60 bg-amber-500/10 p-3 text-sm text-amber-100">
            {response.message}
          </div>
        )}

        {response.fromCache && (
          <div className="rounded-md border border-sky-500/60 bg-sky-500/10 p-3 text-xs text-sky-100">
            Dados servidos do cache. Atualizações podem levar até 5 minutos para refletir novas buscas.
          </div>
        )}

        {response.warnings?.length ? (
          <div className="rounded-md border border-yellow-500/60 bg-yellow-500/10 p-3 text-xs text-yellow-100">
            <p className="font-medium text-sm">Avisos</p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              {response.warnings.map((warn, index) => (
                <li key={`warn-${index}`}>{warn}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {response.errors?.length ? (
          <div className="rounded-md border border-red-500/60 bg-red-500/10 p-3 text-xs text-red-100">
            <p className="font-medium text-sm">Problemas detectados</p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              {response.errors.map((errMsg, index) => (
                <li key={`err-${index}`}>{errMsg}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }, [response]);

  if (loading) {
    return (
      <div className="text-gray-400 text-center py-4">Carregando notícias...</div>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <div className="rounded-md border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      </section>
    );
  }

  if (!news.length) {
    return (
      <section className="space-y-4">
        {statusBanners}
        <div className="text-gray-400 text-center py-4">
          {response?.message || "Nenhuma notícia encontrada."}
        </div>
      </section>
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
      {statusBanners}

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
                <span className={style.text}>
                  {item.sentimento || "neutro"}
                </span>
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
    </section>
  );
}
