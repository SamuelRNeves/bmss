import { useCallback, useEffect, useState } from "react";
import { buildApiUrl, getFetchErrorMessage } from "@/lib/api";

interface DashboardStats {
  totalNews: number;
  totalTweets: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  lastUpdated: string;
}

const INITIAL_STATS: DashboardStats = {
  totalNews: 0,
  totalTweets: 0,
  positivePercentage: 0,
  negativePercentage: 0,
  neutralPercentage: 0,
  lastUpdated: new Date().toISOString(),
};

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === 'development' ? 'http://localhost:8080/api/v1' : undefined);

  const fetchStats = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      setIsLoading(true);
      setError(null);

      if (!API_BASE_URL) {
        throw new Error('API base URL não configurada');
      }

      const [newsResponse, tweetsResponse] = await Promise.allSettled([
        fetch(buildApiUrl("noticias/ultimas?limit=200&q=bitcoin"), {
          signal: controller.signal,
        }),
        fetch(buildApiUrl("noticias/tweets/ultimos?limit=200&q=bitcoin"), {
          signal: controller.signal,
        }),
      ]);

      if (
        newsResponse.status !== "fulfilled" ||
        tweetsResponse.status !== "fulfilled" ||
        !newsResponse.value.ok ||
        !tweetsResponse.value.ok
      ) {
        throw new Error("Não foi possível carregar estatísticas do backend");
      }

      const newsData = await newsResponse.value.json();
      const tweetsData = await tweetsResponse.value.json();

      type SentimentEntry = { sentimento?: string; sentiment?: string };

      const newsItems: SentimentEntry[] = Array.isArray(newsData.data)
        ? newsData.data
        : [];
      const tweetItems: SentimentEntry[] = Array.isArray(tweetsData.data)
        ? tweetsData.data
        : [];
      const allItems: SentimentEntry[] = [...newsItems, ...tweetItems];

      const sentimentCounts = allItems.reduce(
        (acc, item) => {
          const sentiment = (item.sentimento || item.sentiment || "neutral").toLowerCase();

          if (sentiment.startsWith("pos")) acc.positive += 1;
          else if (sentiment.startsWith("neg")) acc.negative += 1;
          else acc.neutral += 1;

          return acc;
        },
        { positive: 0, negative: 0, neutral: 0 }
      );

      const totalItems = allItems.length || 1;

      setStats({
        totalNews: newsItems.length,
        totalTweets: tweetItems.length,
        positivePercentage: Math.round((sentimentCounts.positive / totalItems) * 100),
        negativePercentage: Math.round((sentimentCounts.negative / totalItems) * 100),
        neutralPercentage: Math.round((sentimentCounts.neutral / totalItems) * 100),
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
      setError(getFetchErrorMessage(err));
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}