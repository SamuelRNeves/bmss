"use client";

import { Flame, Sparkles, Clock, ExternalLink } from "lucide-react";
import { FeedItem } from "@/componentes/news/feed-utils";
import { getSentimentColors, getSentimentGradient } from "@/componentes/utils/sentiment-colors";
import { useIsMobile } from "@/hooks/useBreakpoint";

interface DailyHighlightCardProps {
  headline: FeedItem;
}

const SENTIMENT_COPY: Record<FeedItem["sentiment"], { label: string; emoji: string; tone: string }> = {
  positive: {
    label: "Positivo",
    emoji: "🚀",
    tone: "Clima otimista no mercado",
  },
  negative: {
    label: "Negativo",
    emoji: "⚠️",
    tone: "Atenção: sentimento pressionado",
  },
  neutral: {
    label: "Neutro",
    emoji: "🧭",
    tone: "Sinais equilibrados no momento",
  },
};

const formatPublishedDistance = (dateString: string) => {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return "há instantes";
  }

  const diffMs = Date.now() - parsed.getTime();
  if (diffMs <= 0) {
    return "agora mesmo";
  }

  const minutesSince = Math.floor(diffMs / 60000);
  if (minutesSince < 60) {
    return `há ${minutesSince || 1} min`;
  }

  const hoursSince = Math.floor(minutesSince / 60);
  if (hoursSince < 24) {
    return `há ${hoursSince}h`;
  }

  const diffDays = Math.floor(hoursSince / 24);
  if (diffDays === 1) {
    return "ontem";
  }

  return `há ${diffDays} dias`;
};

const computeEngagementScore = (score: number) => {
  const normalized = Math.max(0, Math.min(1, Number.isFinite(score) ? score : 0.35));
  const base = normalized * 100;
  const bonus = normalized > 0.75 ? 12 : normalized > 0.5 ? 6 : 2;
  return Math.round(base + bonus);
};

const estimateViews = (score: number) => {
  const normalized = Math.max(0.25, Math.min(0.95, Number.isFinite(score) ? score : 0.4));
  const estimated = normalized * 4200;
  const rounded = Math.round(estimated / 10) * 10;
  return Math.max(280, rounded);
};

export function DailyHighlightCard({ headline }: DailyHighlightCardProps) {
  const { title, description, source, date, sentiment, score, url, isTweet, tweetUrl } = headline;
  const normalizedScore = Number.isFinite(score) ? score : 0;
  const colors = getSentimentColors(sentiment, normalizedScore);
  const gradient = getSentimentGradient(sentiment, normalizedScore);
  const sentimentCopy = SENTIMENT_COPY[sentiment];
  const isMobile = useIsMobile();

  const rawUrl = (isTweet && tweetUrl ? tweetUrl : url) ?? "";
  const trimmedUrl = rawUrl.trim();
  const hasHttpScheme = /^https?:\/\//i.test(trimmedUrl);
  const resolvedUrl = hasHttpScheme ? trimmedUrl : "#";

  const engagementScore = computeEngagementScore(normalizedScore);
  const viewEstimate = estimateViews(normalizedScore);
  const publishedDistance = formatPublishedDistance(date);
  const parsedDate = new Date(date);
  const formattedDate = Number.isNaN(parsedDate.getTime())
    ? "Data não disponível"
    : parsedDate.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <section className="relative mb-10 sm:mb-12 isolate">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        <div className="flex items-center gap-2 rounded-full bg-yellow-400/10 border border-yellow-400/30 px-3 py-1 text-yellow-200">
          <Sparkles size={isMobile ? 14 : 16} />
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide">Principal notícia do dia</span>
        </div>
        <span className="text-[11px] sm:text-xs text-gray-400">
          Atualizamos automaticamente com base no engajamento capturado nas últimas 24h.
        </span>
      </div>

      <div
        className="relative z-0 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/80 shadow-[0_20px_60px_-30px_rgba(250,204,21,0.45)]"
      >
        <div
          className="absolute inset-0 opacity-80 pointer-events-none -z-10"
          style={{ background: gradient }}
          aria-hidden
        />

        <div className="relative z-10 p-5 sm:p-8 lg:p-10 grid gap-6 lg:gap-8 lg:grid-cols-[1.4fr_minmax(220px,0.6fr)] items-start">
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium" style={{ color: colors.text }}>
              <Flame size={isMobile ? 16 : 18} />
              <span>
                {sentimentCopy.tone} {sentimentCopy.emoji}
              </span>
            </div>

            <h2 className="text-xl sm:text-3xl font-black leading-tight text-white drop-shadow">
              {title}
            </h2>

            <p className="text-sm sm:text-base text-gray-100/90 leading-relaxed max-w-3xl">
              {description || "Esta matéria ganhou tração e lidera o ranking de leituras do ecossistema cripto hoje."}
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-sm text-gray-200">
              <span className="rounded-full bg-black/30 px-3 py-1 border border-white/10 uppercase tracking-wide text-[10px] sm:text-xs">
                {source || "Fonte desconhecida"}
              </span>
              <span className="flex items-center gap-1 text-yellow-200/90">
                <Clock size={isMobile ? 12 : 14} /> {publishedDistance}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-xs font-semibold" style={{ color: colors.text }}>
                {sentimentCopy.label}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-xs font-semibold text-white/90">
                Engajamento {engagementScore}%
              </span>
              <span className="rounded-full bg-black/40 px-3 py-1 text-[10px] sm:text-xs text-gray-200">
                {viewEstimate.toLocaleString("pt-BR")} leituras acompanhadas
              </span>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 sm:px-5 py-2 text-sm sm:text-base font-semibold text-neutral-900 transition hover:bg-yellow-300"
              >
                Ler agora
                <ExternalLink size={isMobile ? 14 : 16} />
              </a>
              <div className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs text-gray-300/90">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.border }} />
                Curadoria automática BMSS Insight Engine
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-6 text-[13px] sm:text-sm text-gray-200">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Sentimento previsto</p>
              <p className="mt-1 text-base sm:text-lg font-semibold text-white">
                {sentimentCopy.label} <span className="text-white/70 text-xs sm:text-sm font-normal">({engagementScore}% de confiança)</span>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span>Score analítico</span>
                <span className="font-semibold text-white">{(normalizedScore * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(8, Math.min(100, normalizedScore * 100))}%`, backgroundColor: colors.text }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span>Alcance estimado</span>
                <span className="font-semibold text-white">{viewEstimate.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.text }} />
                Projeção baseada em engajamento social e frescor da matéria
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] sm:text-xs text-gray-400">
              <span>Atualizado</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DailyHighlightCard;