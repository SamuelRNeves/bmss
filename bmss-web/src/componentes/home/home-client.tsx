"use client";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { StatsCard } from "@/componentes/dashboard/stats-cards";
import { StatusBar } from "@/componentes/status/status-bar";
import { ToastNotifier, showToast } from "@/componentes/notifications/toast-notifier";
import { SentimentBadge } from "@/componentes/status/sentiment-badge";
import LegendaSentimentos from "@/componentes/status/LegendaSentimentos";
import Header from "@/componentes/layout/Header";
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Twitter,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { buildApiUrl, getFetchErrorMessage, getTendencias } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import BitcoinPriceClient from "../BitcoinPriceClient";
import { SentimentDistribution } from "@/componentes/charts/sentiment-distribution";
import DailyHighlightCard from "@/componentes/home/DailyHighlightCard";
import {
  FeedItem,
  createFallbackNews,
  createFallbackTweet,
  mapApiItemToFeedItem,
} from "@/componentes/news/feed-utils";
import type { SentimentSnapshot } from "@/lib/sentiment-insights";
import {
  createDefaultSnapshot,
  createSnapshotFromDistribution,
} from "@/lib/sentiment-insights";

// LAZY LOAD DE TODOS OS COMPONENTES PESADOS
const Recomendacoes = React.lazy(() => import("@/componentes/Recomendacoes"));
const SentimentSignalsPanel = React.lazy(() => import("@/componentes/charts/sentiment-signals-panel"));
const PriceChartSafe = React.lazy(() => import("@/componentes/charts/PriceChartSafe"));
const BitcoinCompletoWrapper = React.lazy(() => import("@/componentes/charts/BitcoinCompletoWrapper"));
const BitcoinChartWrapper = React.lazy(() => import("@/componentes/charts/BitcoinChartWrapper"));
const NewsFeed = React.lazy(() => import("@/componentes/news/news-feed"));
const TweetsFeed = React.lazy(() => import("@/componentes/tweets/tweets-feed"));

interface DashboardStats {
  totalNews: number;
  totalTweets: number;
  positiveSentiment: number;
  negativeSentiment: number;
  neutralSentiment: number;
}

const INITIAL_STATS: DashboardStats = {
  totalNews: 0,
  totalTweets: 0,
  positiveSentiment: 0,
  negativeSentiment: 0,
  neutralSentiment: 0,
};

const generateFallbackNews = (): FeedItem[] =>
  Array.from({ length: 24 }, (_, index) => {
    const base = createFallbackNews();
    const publishedAt = new Date(Date.now() - index * 60 * 60 * 1000).toISOString();
    return {
      ...base,
      title: `Notícia Bitcoin ${index + 1}`,
      description: `Atualização #${index + 1} sobre o comportamento do Bitcoin e seus efeitos no mercado cripto institucional.`,
      source: index % 2 === 0 ? "BMSS Insights" : "CryptoNewsWire",
      date: publishedAt,
      sentiment: ["positive", "negative", "neutral"][index % 3] as FeedItem["sentiment"],
      score: Math.max(0.32, Math.min(0.92, base.score - index * 0.015)),
      url: base.url === "#" ? `https://bmss.digital/noticia/${index + 1}` : base.url,
      isTweet: false,
    };
  });

const generateFallbackTweets = (): FeedItem[] =>
  Array.from({ length: 156 }, (_, index) => {
    const base = createFallbackTweet();
    const publishedAt = new Date(Date.now() - index * 15 * 60 * 1000).toISOString();
    return {
      ...base,
      title: `Tweet Bitcoin ${index + 1}`,
      description: `Comentário #${index + 1} sobre Bitcoin, ETFs e movimentos de mercado capturado pelo BMSS.`,
      source: index % 2 === 0 ? "@bmss_ai" : "@onchainintel",
      date: publishedAt,
      sentiment: ["positive", "negative", "neutral"][index % 3] as FeedItem["sentiment"],
      score: Math.max(0.28, Math.min(0.88, base.score - index * 0.004)),
      url: base.url,
      tweetUrl: base.tweetUrl,
      isTweet: true,
    };
  });

const DAILY_HIGHLIGHT_STORAGE_KEY = "bmss:daily-highlight:v1";

interface StoredHeadlinePayload {
  generatedAt: string;
  headline: FeedItem;
}

type SentimentTrendPoint = {
  label: string;
  positive: number;
  negative: number;
  neutral: number;
};

type TrendSlice = Pick<SentimentTrendPoint, "positive" | "negative" | "neutral">;

const normalizeTrendPercentages = (positive: number, negative: number, neutral: number): TrendSlice => {
  let p = Math.round(positive);
  let n = Math.round(negative);
  let z = Math.round(neutral);
  let total = p + n + z;

  if (total !== 100) {
    if (total > 100) {
      let diff = total - 100;
      const adjustments: Array<{ key: keyof TrendSlice; value: number }> = [
        { key: "positive", value: p },
        { key: "negative", value: n },
        { key: "neutral", value: z },
      ].sort((a, b) => b.value - a.value);

      for (const entry of adjustments) {
        if (diff <= 0) break;
        if (entry.value <= 0) continue;
        const amount = Math.min(entry.value, diff);
        diff -= amount;
        if (entry.key === "positive") p -= amount;
        else if (entry.key === "negative") n -= amount;
        else z -= amount;
      }
    } else if (total < 100) {
      let diff = 100 - total;
      const adjustments: Array<{ key: keyof TrendSlice; value: number }> = [
        { key: "positive", value: p },
        { key: "negative", value: n },
        { key: "neutral", value: z },
      ].sort((a, b) => a.value - b.value);

      for (const entry of adjustments) {
        if (diff <= 0) break;
        const capacity = 100 - entry.value;
        if (capacity <= 0) continue;
        const amount = Math.min(capacity, diff);
        diff -= amount;
        if (entry.key === "positive") p += amount;
        else if (entry.key === "negative") n += amount;
        else z += amount;
      }
    }
  }

  total = p + n + z;
  if (total !== 100) {
    const remainder = 100 - total;
    if (remainder > 0) {
      if (z <= p && z <= n) z += remainder;
      else if (p <= n) p += remainder;
      else n += remainder;
    } else {
      let diff = Math.abs(remainder);
      const order: Array<{ key: keyof TrendSlice; value: number }> = [
        { key: "positive", value: p },
        { key: "negative", value: n },
        { key: "neutral", value: z },
      ].sort((a, b) => b.value - a.value);
      for (const entry of order) {
        if (diff <= 0) break;
        if (entry.value <= 0) continue;
        const amount = Math.min(entry.value, diff);
        diff -= amount;
        if (entry.key === "positive") p -= amount;
        else if (entry.key === "negative") n -= amount;
        else z -= amount;
      }
    }
  }

  return { positive: p, negative: n, neutral: z };
};

const buildSentimentTrend = (
  items: FeedItem[],
  options: { buckets?: number; defaultRatios?: TrendSlice } = {}
): SentimentTrendPoint[] => {
  const bucketCount = options.buckets ?? 7;
  const defaults = options.defaultRatios ?? { positive: 34, negative: 33, neutral: 33 };
  const defaultsTotal = defaults.positive + defaults.negative + defaults.neutral;
  const baseline = defaultsTotal
    ? normalizeTrendPercentages(
        (defaults.positive / defaultsTotal) * 100,
        (defaults.negative / defaultsTotal) * 100,
        (defaults.neutral / defaultsTotal) * 100
      )
    : normalizeTrendPercentages(34, 33, 33);

  const validDates = items
    .map((item) => new Date((item.date as string) ?? ""))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const anchorSource = validDates.length > 0 ? validDates[validDates.length - 1] : new Date();
  const anchor = new Date(anchorSource);
  anchor.setMinutes(0, 0, 0);

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(anchor);
    start.setHours(anchor.getHours() - (bucketCount - 1 - index));
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    return {
      label: start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      start,
      end,
      counts: { positive: 0, negative: 0, neutral: 0 },
    };
  });

  items.forEach((item) => {
    const published = new Date((item.date as string) ?? "");
    if (Number.isNaN(published.getTime())) return;
    const bucket = buckets.find(({ start, end }) => published >= start && published < end);
    if (!bucket) return;
    const normalized = (item.sentiment || "neutral").toLowerCase();
    if (normalized.includes("pos")) bucket.counts.positive += 1;
    else if (normalized.includes("neg")) bucket.counts.negative += 1;
    else bucket.counts.neutral += 1;
  });

  let lastKnown: TrendSlice | null = null;
  return buckets.map(({ label, counts }) => {
    const total = counts.positive + counts.negative + counts.neutral;
    if (total === 0) {
      const fallback = lastKnown ?? baseline;
      const point: SentimentTrendPoint = {
        label,
        positive: fallback.positive,
        negative: fallback.negative,
        neutral: fallback.neutral,
      };
      lastKnown = fallback;
      return point;
    }
    const normalized = normalizeTrendPercentages(
      (counts.positive / total) * 100,
      (counts.negative / total) * 100,
      (counts.neutral / total) * 100
    );
    const point: SentimentTrendPoint = {
      label,
      positive: normalized.positive,
      negative: normalized.negative,
      neutral: normalized.neutral,
    };
    lastKnown = normalized;
    return point;
  });
};

type BackendTrendEntry = {
  day?: string;
  date?: string;
  positive?: number;
  negative?: number;
  neutral?: number;
};

const mapBackendTrendToPoints = (
  entries: BackendTrendEntry[],
  options: { defaultRatios?: TrendSlice } = {}
): SentimentTrendPoint[] => {
  if (!Array.isArray(entries) || entries.length === 0) return [];

  const defaults = options.defaultRatios ?? { positive: 34, negative: 33, neutral: 33 };
  const defaultsTotal = defaults.positive + defaults.negative + defaults.neutral;
  const baseline = defaultsTotal
    ? normalizeTrendPercentages(
        (defaults.positive / defaultsTotal) * 100,
        (defaults.negative / defaultsTotal) * 100,
        (defaults.neutral / defaultsTotal) * 100
      )
    : normalizeTrendPercentages(34, 33, 33);

  let lastKnown: TrendSlice | null = null;
  return entries.slice(-7).map((entry, index) => {
    const rawPositive = typeof entry.positive === "number" ? entry.positive * 100 : 0;
    const rawNegative = typeof entry.negative === "number" ? entry.negative * 100 : 0;
    const rawNeutral = typeof entry.neutral === "number" ? entry.neutral * 100 : 0;
    const label = entry.day?.trim() || entry.date?.toString() || `Dia ${index + 1}`;

    const total = rawPositive + rawNegative + rawNeutral;
    if (total <= 0) {
      const fallback = lastKnown ?? baseline;
      lastKnown = fallback;
      return {
        label,
        positive: fallback.positive,
        negative: fallback.negative,
        neutral: fallback.neutral,
      };
    }

    const normalized = normalizeTrendPercentages(rawPositive, rawNegative, rawNeutral);
    lastKnown = normalized;
    return {
      label,
      positive: normalized.positive,
      negative: normalized.negative,
      neutral: normalized.neutral,
    };
  });
};

const aggregateSentimentCounts = (items: FeedItem[]) =>
  items.reduce(
    (acc, item) => {
      const s = (item.sentiment || "neutral").toLowerCase();
      if (s.includes("pos")) acc.positive += 1;
      else if (s.includes("neg")) acc.negative += 1;
      else acc.neutral += 1;
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 }
  );

const getStartOfDay = (value: Date) => {
  const clone = new Date(value);
  clone.setHours(0, 0, 0, 0);
  return clone;
};

const isSameCalendarDay = (left: Date, right: Date) =>
  getStartOfDay(left).getTime() === getStartOfDay(right).getTime();

const sanitizeHeadlineForStorage = (headline: FeedItem): FeedItem => ({
  ...headline,
  url: typeof headline.url === "string" ? headline.url.trim() : "#",
  tweetUrl: typeof headline.tweetUrl === "string" ? headline.tweetUrl.trim() : headline.tweetUrl,
});

const isFallbackHeadline = (headline: FeedItem | null) => {
  if (!headline) return true;
  const url = typeof headline.url === "string" ? headline.url.trim() : "";
  if (!url || url === "#") return true;
  if (/^https?:\/\/bmss\.digital\/noticia\//i.test(url)) return true;
  return false;
};

export default function HomeClient() {
  const { user, loading: authLoading } = useAuth();

  // TODOS OS HOOKS ANTES DE QUALQUER RETURN
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const previousStatsRef = useRef<DashboardStats | null>(null);
  const mountedRef = useRef(true);
  const [dailyHeadline, setDailyHeadline] = useState<FeedItem | null>(null);

  const fallbackTrend = useMemo(
    () => buildSentimentTrend([...generateFallbackNews(), ...generateFallbackTweets()]),
    []
  );

  const [sentimentTrend, setSentimentTrend] = useState<SentimentTrendPoint[]>(fallbackTrend);
  const [recommendationSnapshot, setRecommendationSnapshot] = useState<SentimentSnapshot>(
    () => createDefaultSnapshot()
  );

  const fallbackMode = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    return Boolean(raw && raw.toLowerCase().includes("fallback"));
  }, []);

  const fallbackHeadline = useMemo<FeedItem>(
    () => ({
      ...createFallbackNews(),
      title: "Bitcoin lidera buscas após ondas de volatilidade",
      description:
        "O ativo voltou ao topo das atenções com forte volume nas últimas horas. Analistas acompanham possíveis gatilhos macroeconômicos.",
      source: "BMSS Insights",
      sentiment: "positive",
      score: 0.82,
      url: "#",
    }),
    []
  );

  const fetchBackendTrends = useCallback(async (defaultRatios?: TrendSlice) => {
    try {
      const response = await getTendencias();
      if (!response || !Array.isArray(response.data) || response.isFallback) {
        return;
      }
      const normalized = mapBackendTrendToPoints(response.data as BackendTrendEntry[], {
        defaultRatios,
      });
      if (normalized.length > 0) {
        setSentimentTrend(normalized);
      }
    } catch (error) {
      console.warn("Não foi possível carregar tendências do backend:", error);
    }
  }, []);

  const loadStoredHighlight = useCallback((): FeedItem | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(DAILY_HIGHLIGHT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredHeadlinePayload | null;
      if (!parsed?.headline || !parsed.generatedAt) return null;
      const generatedAt = new Date(parsed.generatedAt);
      if (Number.isNaN(generatedAt.getTime())) {
        window.localStorage.removeItem(DAILY_HIGHLIGHT_STORAGE_KEY);
        return null;
      }
      if (!isSameCalendarDay(generatedAt, new Date())) {
        window.localStorage.removeItem(DAILY_HIGHLIGHT_STORAGE_KEY);
        return null;
      }
      return parsed.headline;
    } catch (error) {
      console.warn("Não foi possível carregar o destaque diário armazenado:", error);
      return null;
    }
  }, []);

  const persistHighlight = useCallback((headline: FeedItem) => {
    if (typeof window === "undefined") return;
    try {
      const payload: StoredHeadlinePayload = {
        generatedAt: new Date().toISOString(),
        headline: sanitizeHeadlineForStorage(headline),
      };
      window.localStorage.setItem(DAILY_HIGHLIGHT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Não foi possível salvar o destaque diário:", error);
    }
  }, []);

  const clearStoredHighlight = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(DAILY_HIGHLIGHT_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const stored = loadStoredHighlight();
    if (stored && !isFallbackHeadline(stored)) {
      setDailyHeadline(stored);
    }
  }, [loadStoredHighlight]);

  const pickDailyHighlight = useCallback(
    (items: FeedItem[]): FeedItem => {
      if (!items || items.length === 0) {
        return fallbackHeadline;
      }
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const scoredItems = items.map((item) => {
        const published = new Date(item.date ?? "");
        const isToday = !Number.isNaN(published.getTime()) && published >= startOfToday;
        const hoursAgo = Number.isNaN(published.getTime())
          ? 48
          : Math.max(0, (Date.now() - published.getTime()) / 36e5);
        const freshness = Math.max(0, 1 - Math.min(hoursAgo, 48) / 48);
        const baseScore = Number.isFinite(item.score) ? item.score : 0.4;
        const sentimentBoost = item.sentiment === "positive" ? 0.08 : item.sentiment === "negative" ? 0.04 : 0.02;
        const accessWeight = baseScore * 0.65 + freshness * 0.3 + sentimentBoost;
        return {
          item,
          weight: accessWeight + (isToday ? 0.15 : 0),
        };
      });

      scoredItems.sort((a, b) => b.weight - a.weight);
      return scoredItems[0]?.item ?? fallbackHeadline;
    },
    [fallbackHeadline]
  );

  const fetchStats = useCallback(async () => {
    if (!mountedRef.current) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      setIsLoading(true);

      if (fallbackMode) {
        console.warn("API configurada em modo fallback. Usando dados de demonstração.");
        showToast("warning", "Modo Offline", "Exibindo dados de demonstração.", 5000);

        const fallbackNews = generateFallbackNews();
        const fallbackTweets = generateFallbackTweets();
        const fallbackItems = [...fallbackNews, ...fallbackTweets];
        const sentimentCounts = aggregateSentimentCounts(fallbackItems);
        const fallbackTotal = fallbackItems.length || 1;
        const fallbackPercentages = normalizeTrendPercentages(
          (sentimentCounts.positive / fallbackTotal) * 100,
          (sentimentCounts.negative / fallbackTotal) * 100,
          (sentimentCounts.neutral / fallbackTotal) * 100
        );

        const fallbackStats = {
          totalNews: fallbackNews.length,
          totalTweets: fallbackTweets.length,
          positiveSentiment: fallbackPercentages.positive,
          negativeSentiment: fallbackPercentages.negative,
          neutralSentiment: fallbackPercentages.neutral,
        };

        previousStatsRef.current = fallbackStats;
        setStats(fallbackStats);
        setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
        setSentimentTrend(
          buildSentimentTrend(fallbackItems, {
            defaultRatios: {
              positive: fallbackStats.positiveSentiment,
              negative: fallbackStats.negativeSentiment,
              neutral: fallbackStats.neutralSentiment,
            },
          })
        );

        if (!fallbackMode) {
          fetchBackendTrends({
            positive: fallbackStats.positiveSentiment,
            negative: fallbackStats.negativeSentiment,
            neutral: fallbackStats.neutralSentiment,
          });
        }

        const storedHeadline = loadStoredHighlight();
        if (storedHeadline && !isFallbackHeadline(storedHeadline)) {
          setDailyHeadline(storedHeadline);
        } else {
          setDailyHeadline(fallbackHeadline);
          clearStoredHighlight();
        }
        return;
      }

      const [newsRes, tweetsRes] = await Promise.allSettled([
        fetch(buildApiUrl("noticias/ultimas?limit=50&q=bitcoin"), { signal: controller.signal }),
        fetch(buildApiUrl("noticias/tweets/ultimos?limit=50&q=bitcoin"), { signal: controller.signal }),
      ]);

      let mappedNews: FeedItem[] = [];
      if (newsRes.status === "fulfilled" && newsRes.value.ok) {
        const body = await newsRes.value.json();
        const data = Array.isArray(body?.data) ? body.data : [];
        if (data.length > 0) {
          mappedNews = data.map((item: unknown, index: number) =>
            mapApiItemToFeedItem(item, {
              ...createFallbackNews(),
              title: `Notícia Bitcoin ${index + 1}`,
            })
          );
        }
      }
      if (mappedNews.length === 0) mappedNews = generateFallbackNews();

      let mappedTweets: FeedItem[] = [];
      if (tweetsRes.status === "fulfilled" && tweetsRes.value.ok) {
        const body = await tweetsRes.value.json();
        const data = Array.isArray(body?.data) ? body.data : [];
        if (data.length > 0) {
          mappedTweets = data.map((item: unknown, index: number) =>
            mapApiItemToFeedItem(item, {
              ...createFallbackTweet(),
              title: `Tweet Bitcoin ${index + 1}`,
            })
          );
        }
      }
      if (mappedTweets.length === 0) mappedTweets = generateFallbackTweets();

      const allItems = [...mappedNews, ...mappedTweets];
      const sentimentCounts = aggregateSentimentCounts(allItems);
      const scoreValues = allItems
        .map((item) => {
          const value = typeof item.score === "number" ? item.score : Number(item.score);
          return Number.isFinite(value) ? value : null;
        })
        .filter((value): value is number => value !== null);

      const total = allItems.length || 1;
      const normalizedPercentages = normalizeTrendPercentages(
        (sentimentCounts.positive / total) * 100,
        (sentimentCounts.negative / total) * 100,
        (sentimentCounts.neutral / total) * 100
      );

      const averageScore =
        scoreValues.length > 0
          ? scoreValues.reduce((acc, curr) => acc + curr, 0) / scoreValues.length
          : 0;

      const snapshotDistribution = {
        positivo: normalizedPercentages.positive,
        negativo: normalizedPercentages.negative,
        neutro: normalizedPercentages.neutral,
      };

      const newStats = {
        totalNews: mappedNews.length,
        totalTweets: mappedTweets.length,
        positiveSentiment: normalizedPercentages.positive,
        negativeSentiment: normalizedPercentages.negative,
        neutralSentiment: normalizedPercentages.neutral,
      };

      if (previousStatsRef.current) {
        const diffPos = Math.abs(newStats.positiveSentiment - previousStatsRef.current.positiveSentiment);
        const diffNeg = Math.abs(newStats.negativeSentiment - previousStatsRef.current.negativeSentiment);
        if (diffPos > 12) showToast("success", "Positivo em Alta", `+${diffPos}%`);
        if (diffNeg > 12) showToast("warning", "Negativo em Alta", `+${diffNeg}%`);
      }

      previousStatsRef.current = newStats;
      setStats(newStats);
      setRecommendationSnapshot(
        createSnapshotFromDistribution({
          media: averageScore,
          distribuicao: snapshotDistribution,
          totalItens: allItems.length,
        })
      );
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
      setSentimentTrend(
        buildSentimentTrend(allItems, {
          defaultRatios: {
            positive: newStats.positiveSentiment,
            negative: newStats.negativeSentiment,
            neutral: newStats.neutralSentiment,
          },
        })
      );

      fetchBackendTrends({
        positive: newStats.positiveSentiment,
        negative: newStats.negativeSentiment,
        neutral: newStats.neutralSentiment,
      });

      const candidateHeadline = pickDailyHighlight(mappedNews);
      const storedHeadline = loadStoredHighlight();
      if (storedHeadline && !isFallbackHeadline(storedHeadline)) {
        setDailyHeadline(storedHeadline);
      } else {
        setDailyHeadline(candidateHeadline);
        if (!isFallbackHeadline(candidateHeadline)) {
          persistHighlight(candidateHeadline);
        } else {
          clearStoredHighlight();
        }
      }
    } catch (error) {
      console.error("Erro:", error);
      const message = getFetchErrorMessage(error);
      const isTimeoutMessage = message.toLowerCase().includes("tempo de resposta excedido");
      if (!isTimeoutMessage) {
        showToast("error", "Erro", message);
      }

      const fallbackNews = generateFallbackNews();
      const fallbackTweets = generateFallbackTweets();
      const fallbackItems = [...fallbackNews, ...fallbackTweets];
      const sentimentCounts = aggregateSentimentCounts(fallbackItems);
      const fallbackTotal = fallbackItems.length || 1;
      const fallbackScoreValues = fallbackItems
        .map((item) => {
          const value = typeof item.score === "number" ? item.score : Number(item.score);
          return Number.isFinite(value) ? value : null;
        })
        .filter((value): value is number => value !== null);

      const fallbackPercentages = normalizeTrendPercentages(
        (sentimentCounts.positive / fallbackTotal) * 100,
        (sentimentCounts.negative / fallbackTotal) * 100,
        (sentimentCounts.neutral / fallbackTotal) * 100
      );

      const fallbackAverageScore =
        fallbackScoreValues.length > 0
          ? fallbackScoreValues.reduce((acc, curr) => acc + curr, 0) / fallbackScoreValues.length
          : 0;

      const fallbackStats = {
        totalNews: fallbackNews.length,
        totalTweets: fallbackTweets.length,
        positiveSentiment: fallbackPercentages.positive,
        negativeSentiment: fallbackPercentages.negative,
        neutralSentiment: fallbackPercentages.neutral,
      };

      previousStatsRef.current = fallbackStats;
      setStats(fallbackStats);
      setRecommendationSnapshot(
        createSnapshotFromDistribution({
          media: fallbackAverageScore,
          distribuicao: {
            positivo: fallbackPercentages.positive,
            negativo: fallbackPercentages.negative,
            neutro: fallbackPercentages.neutral,
          },
          totalItens: fallbackItems.length,
        })
      );

      setSentimentTrend(
        buildSentimentTrend(fallbackItems, {
          defaultRatios: {
            positive: fallbackStats.positiveSentiment,
            negative: fallbackStats.negativeSentiment,
            neutral: fallbackStats.neutralSentiment,
          },
        })
      );

      fetchBackendTrends({
        positive: fallbackStats.positiveSentiment,
        negative: fallbackStats.negativeSentiment,
        neutral: fallbackStats.neutralSentiment,
      });

      const storedHeadline = loadStoredHighlight();
      if (storedHeadline && !isFallbackHeadline(storedHeadline)) {
        setDailyHeadline(storedHeadline);
      } else {
        setDailyHeadline(fallbackHeadline);
        clearStoredHighlight();
      }
    } finally {
      clearTimeout(timeoutId);
      if (mountedRef.current) setIsLoading(false);
    }
  }, [
    fallbackMode,
    fallbackHeadline,
    fetchBackendTrends,
    pickDailyHighlight,
    loadStoredHighlight,
    persistHighlight,
    clearStoredHighlight,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchStats]);

  const handleManualRefresh = useCallback(() => {
    fetchStats();
    showToast("info", "Atualizando", "Buscando dados...", 2000);
  }, [fetchStats]);

  const sentimentBadges = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-3">
        <SentimentBadge sentiment="positive" score={stats.positiveSentiment / 100} count={stats.positiveSentiment} showTrend />
        <SentimentBadge sentiment="negative" score={stats.negativeSentiment / 100} count={stats.negativeSentiment} showTrend />
        <SentimentBadge sentiment="neutral" score={stats.neutralSentiment / 100} count={stats.neutralSentiment} />
      </div>
    ),
    [stats]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-white text-xl">Carregando autenticação...</p>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />
      <StatusBar />
      <ToastNotifier />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          {/* Cabeçalho */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 sm:mb-8 gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard Bitcoin</h1>
              <p className="text-sm sm:text-base text-gray-400">
                Análise de sentimento em tempo real
                {lastUpdate && (
                  <span className="block sm:inline text-gray-500 text-xs sm:text-sm sm:ml-2">
                    • Atualizado: {lastUpdate}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-70 transition font-medium w-full sm:w-auto"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              {isLoading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          {/* Badges de sentimento */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 mb-8 p-4 bg-neutral-900 rounded-lg border border-neutral-800">
            <span className="text-gray-400 text-xs sm:text-sm">Sentimento Geral:</span>
            <div className="w-full sm:w-auto flex flex-wrap gap-3">{sentimentBadges}</div>
          </div>

          {dailyHeadline && <DailyHighlightCard headline={dailyHeadline} />}

          <Suspense fallback={<div className="h-32 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
            <BitcoinPriceClient />
          </Suspense>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 my-8">
            <StatsCard title="Notícias" value={isLoading ? "..." : stats.totalNews.toString()} change={8.2} icon={<Newspaper size={24} />} sentiment="positive" />
            <StatsCard title="Tweets" value={isLoading ? "..." : stats.totalTweets.toString()} change={15.7} icon={<Twitter size={24} />} sentiment="positive" />
            <StatsCard title="Positivo" value={isLoading ? "..." : `${stats.positiveSentiment}%`} change={2.5} icon={<TrendingUp size={24} />} sentiment="positive" />
            <StatsCard title="Negativo" value={isLoading ? "..." : `${stats.negativeSentiment}%`} change={-1.2} icon={<TrendingDown size={24} />} sentiment="negative" />
          </div>

          <Suspense fallback={<div className="h-48 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
            <Recomendacoes snapshot={recommendationSnapshot} isLoading={isLoading} />
          </Suspense>

          {/* Análise de Sentimento */}
          <div className="my-10 sm:my-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-yellow-400" size={24} />
                <h2 className="text-xl sm:text-2xl font-bold">Análise de Sentimento</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <Suspense fallback={<div className="h-72 sm:h-80 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
                <SentimentSignalsPanel
                  trend={sentimentTrend}
                  distribution={{
                    positive: stats.positiveSentiment,
                    negative: stats.negativeSentiment,
                    neutral: stats.neutralSentiment,
                  }}
                />
              </Suspense>

              <Suspense fallback={<div className="h-72 sm:h-80 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
                <SentimentDistribution
                  distribution={{
                    positive: stats.positiveSentiment,
                    negative: stats.negativeSentiment,
                    neutral: stats.neutralSentiment,
                  }}
                />
              </Suspense>
            </div>
          </div>

          {/* Gráficos de preço */}
          <div className="my-10 sm:my-12">
            <Suspense fallback={<div className="h-80 sm:h-96 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
              <PriceChartSafe />
            </Suspense>
          </div>

          <div className="my-10 sm:my-12">
            <Suspense fallback={<div className="h-80 sm:h-96 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
              <BitcoinCompletoWrapper />
            </Suspense>
          </div>

          <div className="my-10 sm:my-12">
            <Suspense fallback={<div className="h-80 sm:h-96 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
              <BitcoinChartWrapper />
            </Suspense>
          </div>

          <div className="my-8">
            <Suspense fallback={<div className="h-24 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />}>
              <LegendaSentimentos />
            </Suspense>
          </div>

          {/* Feeds */}
          <div className="my-10 sm:my-12">
            <Suspense fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 h-40 sm:h-48 animate-pulse" />
                ))}
              </div>
            }>
              <NewsFeed />
            </Suspense>
          </div>

          <div className="my-10 sm:my-12">
            <Suspense fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 h-40 sm:h-48 animate-pulse" />
                ))}
              </div>
            }>
              <TweetsFeed />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}