"use client";

export type Sentiment = "positive" | "neutral" | "negative";

export interface FeedItem {
  title: string;
  description: string;
  source: string;
  date: string;
  sentiment: Sentiment;
  score: number;
  url: string;
  isTweet: boolean;
  tweetUrl?: string;
}

export interface SentimentOption {
  value: string;
  label: string;
}

export const SENTIMENT_FILTER_OPTIONS: SentimentOption[] = [
  { value: "todos", label: "Todas" },
  { value: "positivo", label: "Positivas" },
  { value: "neutro", label: "Neutras" },
  { value: "negativo", label: "Negativas" },
];

const sentimentMap: Record<string, Sentiment | "todos"> = {
  positivo: "positive",
  positive: "positive",
  negativo: "negative",
  negative: "negative",
  neutro: "neutral",
  neutral: "neutral",
  todos: "todos",
};

export const mapSentimentFilter = (
  value: string
): Sentiment | "todos" => {
  if (!value) return "todos";
  const normalized = value.toLowerCase();
  return sentimentMap[normalized] ?? "todos";
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const normalizeSentiment = (value: unknown): Sentiment => {
  if (typeof value !== "string") return "neutral";
  const normalized = value.toLowerCase();
  switch (normalized) {
    case "positive":
    case "positivo":
      return "positive";
    case "negative":
    case "negativo":
      return "negative";
    default:
      return "neutral";
  }
};

export const mapApiItemToFeedItem = (
  item: unknown,
  fallback: FeedItem
): FeedItem => {
  if (!isRecord(item)) {
    return { ...fallback };
  }

  const data = item as Record<string, unknown>;
  const clone = { ...fallback };

  const getString = (field: string): string | undefined => {
    const value = data[field];
    if (typeof value === "string" && value.trim().length > 0) return value;
    return undefined;
  };

  const pickFirstString = (...fields: string[]): string | undefined => {
    for (const field of fields) {
      const value = getString(field);
      if (value) return value;
    }
    return undefined;
  };

  const rawScore = data.score;
  const rawIsTweet = data.isTweet ?? data.tweet;
  const isTweet = typeof rawIsTweet === "boolean" ? rawIsTweet : Boolean(rawIsTweet ?? clone.isTweet);

  return {
    ...clone,
    title: pickFirstString("title", "text") ?? clone.title,
    description: pickFirstString("description", "text") ?? clone.description,
    source: pickFirstString("source", "sourceName") ?? clone.source,
    date:
      pickFirstString("publishedAt", "date") ??
      (Array.isArray(data["publishedAt"]) ? String(data["publishedAt"][0]) : clone.date),
    sentiment: normalizeSentiment(data["sentimento"] ?? data["sentiment"] ?? clone.sentiment),
    score:
      typeof rawScore === "number"
        ? rawScore
        : Number(typeof rawScore === "string" ? rawScore : clone.score) || clone.score,
    url: pickFirstString("url", "link") ?? clone.url,
    isTweet,
    tweetUrl:
      pickFirstString("tweetUrl") ??
      (isTweet ? pickFirstString("url", "link", "tweetUrl") ?? clone.tweetUrl : undefined),
  };
};

export const createFallbackNews = (): FeedItem => ({
  title: "Bitcoin atinge nova máxima histórica",
  description: "Preço supera $73.000 com entrada de institucionais.",
  source: "CoinDesk",
  date: new Date().toISOString(),
  sentiment: "positive",
  score: 0.95,
  url: "#",
  isTweet: false,
  tweetUrl: undefined,
});

export const createFallbackTweet = (): FeedItem => ({
  title: "Bitcoin rompe $70k com força!",
  description: "ETF da BlackRock registra maior volume da história. Touros dominam.",
  source: "@crypto_king",
  date: new Date().toISOString(),
  sentiment: "positive",
  score: 0.94,
  url: "https://twitter.com/crypto_king/status/123",
  isTweet: true,
  tweetUrl: "https://twitter.com/crypto_king/status/123",
});

export const buildFallbackList = (
  type: "news" | "tweets"
): FeedItem[] => {
  if (type === "tweets") {
    const primary = createFallbackTweet();
    return [
      primary,
      {
        ...createFallbackTweet(),
        title: "FUD: Regulador pode banir staking",
        description: "Notícia falsa espalhada por conta hackeada. Comunidade em alerta.",
        source: "@bear_whisperer",
        date: new Date(Date.now() - 3600000).toISOString(),
        sentiment: "negative",
        score: 0.78,
        url: "https://twitter.com/bear_whisperer/status/456",
        tweetUrl: "https://twitter.com/bear_whisperer/status/456",
      },
    ];
  }

  return [createFallbackNews()];
};
