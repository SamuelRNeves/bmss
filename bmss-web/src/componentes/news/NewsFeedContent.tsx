"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { NewsCard } from "./news-card";
import { buildApiUrl, getFetchErrorMessage } from "@/lib/api";
import {
  FeedItem,
  SENTIMENT_FILTER_OPTIONS,
  buildFallbackList,
  createFallbackNews,
  mapApiItemToFeedItem,
  mapSentimentFilter,
} from "./feed-utils";

const FETCH_LIMIT = 120;
const INITIAL_VISIBLE_NEWS = 6;

export default function NewsFeedContent() {
  const [news, setNews] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState("todos");
  const [visibleNewsCount, setVisibleNewsCount] = useState(0);
  const [hasFetched, setHasFetched] = useState(false);

  const sentimentOptions = useMemo(() => SENTIMENT_FILTER_OPTIONS, []);

  const fetchNews = useCallback(
    async (filterParam?: string) => {
      setIsLoading(true);
      try {
        const filter = filterParam ?? sentimentFilter;
        const mappedFilter = mapSentimentFilter(filter);
        const endpoint =
          mappedFilter === "todos"
            ? buildApiUrl(`noticias/ultimas?limit=${FETCH_LIMIT}&q=bitcoin`)
            : buildApiUrl(`noticias/filtrar?sentiment=${mappedFilter}&limit=${FETCH_LIMIT}`);

        const res = await fetch(endpoint);
        const data = await res.json();
        const items: FeedItem[] = Array.isArray(data?.data)
          ? data.data.map((item: unknown) => mapApiItemToFeedItem(item, createFallbackNews()))
          : [];

        setNews(items);
        setHasFetched(true);
        setVisibleNewsCount((prev) => {
          if (items.length === 0) {
            return 0;
          }

          if (prev > INITIAL_VISIBLE_NEWS) {
            return Math.min(items.length, prev);
          }

          return Math.min(INITIAL_VISIBLE_NEWS, items.length);
        });
      } catch (err) {
        console.error("Erro ao buscar notícias:", getFetchErrorMessage(err));
        const fallback = buildFallbackList("news");
        setNews(fallback);
        setHasFetched(true);
        setVisibleNewsCount((prev) => {
          if (prev > INITIAL_VISIBLE_NEWS) {
            return Math.min(fallback.length, prev);
          }
          return Math.min(INITIAL_VISIBLE_NEWS, fallback.length);
        });
      } finally {
        setIsLoading(false);
      }
    },
    [sentimentFilter]
  );

  const refreshNews = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const endpoint = buildApiUrl(`noticias/analisar?limit=${FETCH_LIMIT}&q=bitcoin`);
      const response = await fetch(endpoint, { method: "POST" });

      if (!response.ok) {
        let message = response.statusText;
        try {
          const body = await response.json();
          if (typeof body?.message === "string" && body.message.trim().length > 0) {
            message = body.message;
          }
        } catch (error) {
          console.warn("Não foi possível interpretar resposta ao atualizar notícias:", error);
        }
        throw new Error(message || "Falha ao atualizar notícias");
      }
    } catch (err) {
      console.error("Erro ao atualizar notícias:", getFetchErrorMessage(err));
    } finally {
      setIsRefreshing(false);
      await fetchNews(sentimentFilter);
    }
  }, [fetchNews, sentimentFilter]);

  const handleFilterChange = useCallback(
    (value: string) => {
      setSentimentFilter(value);
      if (hasFetched) {
        fetchNews(value);
      }
    },
    [fetchNews, hasFetched]
  );

  const handleInitialLoad = useCallback(() => {
    if (!isLoading) {
      fetchNews(sentimentFilter);
    }
  }, [fetchNews, isLoading, sentimentFilter]);

  useEffect(() => {
    if (!hasFetched && !isLoading) {
      fetchNews(sentimentFilter);
    }
  }, [fetchNews, hasFetched, isLoading, sentimentFilter]);

  const visibleNews = news.slice(0, visibleNewsCount);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-400">
          Filtre insights de sentimento para focar nas notícias que importam.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={hasFetched ? refreshNews : handleInitialLoad}
            disabled={isLoading || isRefreshing}
            className="flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-4 py-2 font-semibold text-neutral-900 shadow transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                {hasFetched ? "Atualizar notícias" : "Carregar notícias"}
              </>
            )}
          </button>

          <select
            value={sentimentFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
          >
            {sentimentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-center py-6">Carregando notícias...</div>
      ) : !hasFetched ? (
        <div className="text-gray-400 text-center py-6">Preparando o feed...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleNews.length > 0 ? (
              visibleNews.map((item, i) => (
                <NewsCard
                  key={`${item.url}-${i}`}
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
              <p className="text-gray-400 text-center col-span-full">
                Nenhuma notícia encontrada.
              </p>
            )}
          </div>

          {visibleNewsCount < news.length && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => setVisibleNewsCount(news.length)}
                className="px-5 py-2 rounded-full bg-yellow-400 text-neutral-900 font-semibold shadow hover:bg-yellow-300 transition-colors"
              >
                Mostrar mais notícias
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}