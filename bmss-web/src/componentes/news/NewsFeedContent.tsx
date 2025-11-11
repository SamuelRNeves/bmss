"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const FETCH_LIMIT = 24;
const INITIAL_VISIBLE_NEWS = 6;

export default function NewsFeedContent() {
  const [news, setNews] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState("todos");
  const [visibleNewsCount, setVisibleNewsCount] = useState(INITIAL_VISIBLE_NEWS);

  const sentimentOptions = useMemo(() => SENTIMENT_FILTER_OPTIONS, []);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    try {
      const mappedFilter = mapSentimentFilter(sentimentFilter);
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
      setVisibleNewsCount(
        items.length > 0 ? Math.min(INITIAL_VISIBLE_NEWS, items.length) : 0
      );
    } catch (err) {
      console.error("Erro ao buscar notícias:", getFetchErrorMessage(err));
      const fallback = buildFallbackList("news");
      setNews(fallback);
      setVisibleNewsCount(Math.min(INITIAL_VISIBLE_NEWS, fallback.length));
    } finally {
      setIsLoading(false);
    }
  }, [sentimentFilter]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    setVisibleNewsCount(INITIAL_VISIBLE_NEWS);
  }, [sentimentFilter]);

  const visibleNews = news.slice(0, visibleNewsCount);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <p className="text-sm text-gray-400">
          Filtre insights de sentimento para focar nas notícias que importam.
        </p>
        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
        >
          {sentimentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-center py-6">Carregando notícias...</div>
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