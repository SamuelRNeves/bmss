// componentes/tweets/TweetsFeedContent.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { NewsCard } from "../news/news-card";
import { buildApiUrl, getFetchErrorMessage } from "@/lib/api";
import {
  FeedItem,
  SENTIMENT_FILTER_OPTIONS,
  buildFallbackList,
  createFallbackTweet,
  mapApiItemToFeedItem,
  mapSentimentFilter,
} from "../news/feed-utils";

const FETCH_LIMIT = 24;
const INITIAL_VISIBLE_TWEETS = 6;

export default function TweetsFeedContent() {
  const [tweets, setTweets] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState("todos");
  const [visibleTweetsCount, setVisibleTweetsCount] = useState(INITIAL_VISIBLE_TWEETS);

  const sentimentOptions = useMemo(() => SENTIMENT_FILTER_OPTIONS, []);

  const generateFallbackTweets = useCallback(() => buildFallbackList("tweets"), []);

  const fetchTweets = useCallback(async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const shouldUseFallback = !apiBaseUrl || apiBaseUrl.includes("fallback");

    if (shouldUseFallback) {
      const fallback = generateFallbackTweets();
      setTweets(fallback);
      setVisibleTweetsCount(Math.min(INITIAL_VISIBLE_TWEETS, fallback.length));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mappedFilter = mapSentimentFilter(sentimentFilter);
      const endpoint =
        mappedFilter === "todos"
          ? buildApiUrl(`noticias/tweets/ultimos?limit=${FETCH_LIMIT}&q=bitcoin`)
          : buildApiUrl(`noticias/tweets/filtrar?sentiment=${mappedFilter}&limit=${FETCH_LIMIT}`);

      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`Falha na API (${res.status})`);
      }

      const json = await res.json();
      const items: FeedItem[] = Array.isArray(json?.data)
        ? json.data.map((item: unknown) => mapApiItemToFeedItem(item, createFallbackTweet()))
        : [];

      setTweets(items.map((tweet) => ({ ...tweet, isTweet: true })));
      setVisibleTweetsCount(items.length > 0 ? Math.min(INITIAL_VISIBLE_TWEETS, items.length) : 0);
    } catch (err) {
      console.error("Erro ao carregar tweets:", getFetchErrorMessage(err));
      setError("Erro ao carregar tweets");
      const fallback = generateFallbackTweets();
      setTweets(fallback);
      setVisibleTweetsCount(Math.min(INITIAL_VISIBLE_TWEETS, fallback.length));
    } finally {
      setIsLoading(false);
    }
  }, [generateFallbackTweets, sentimentFilter]);

  useEffect(() => {
    fetchTweets();
  }, [fetchTweets]);

  useEffect(() => {
    setVisibleTweetsCount(INITIAL_VISIBLE_TWEETS);
  }, [sentimentFilter]);

  const visibleTweets = tweets.slice(0, visibleTweetsCount);

  if (error && tweets.length === 0) {
    return (
      <div className="text-center py-12 text-red-400">
        {error}
        <button
          onClick={fetchTweets}
          className="ml-4 bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <p className="text-sm text-gray-400">
          Refine o humor do mercado no X selecionando o sentimento desejado.
        </p>
        <div className="flex items-center gap-3">
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
          >
            {sentimentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchTweets}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-700 text-gray-200 hover:bg-neutral-800 transition-colors"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : undefined} />
            Atualizar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-center py-6">Carregando tweets...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleTweets.length > 0 ? (
              visibleTweets.map((tweet, index) => (
                <NewsCard
                  key={`${tweet.url}-${index}`}
                  title={tweet.title}
                  description={tweet.description}
                  source={tweet.source}
                  date={tweet.date}
                  sentiment={tweet.sentiment}
                  score={tweet.score}
                  url={tweet.url}
                  isTweet
                  tweetUrl={tweet.tweetUrl}
                />
              ))
            ) : (
              <p className="text-gray-400 text-center col-span-full">
                Nenhum tweet encontrado.
              </p>
            )}
          </div>

          {visibleTweetsCount < tweets.length && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => setVisibleTweetsCount(tweets.length)}
                className="px-5 py-2 rounded-full bg-sky-500 text-neutral-900 font-semibold shadow hover:bg-sky-400 transition-colors"
              >
                Mostrar mais tweets
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
