"use client";

import React, { useMemo } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

const SENTIMENTS = [
  {
    key: "positive" as const,
    label: "Positivo",
    description: "Confiança euforia",
    accent: "from-emerald-500/30 via-emerald-500/10 to-transparent",
    lineColor: "text-emerald-300",
    badgeColor: "bg-emerald-500/20 text-emerald-200",
  },
  {
    key: "neutral" as const,
    label: "Neutro",
    description: "Expectativa cautelosa",
    accent: "from-slate-400/20 via-slate-400/5 to-transparent",
    lineColor: "text-slate-300",
    badgeColor: "bg-slate-500/10 text-slate-200",
  },
  {
    key: "negative" as const,
    label: "Negativo",
    description: "Aversão a risco",
    accent: "from-rose-500/30 via-rose-500/10 to-transparent",
    lineColor: "text-rose-300",
    badgeColor: "bg-rose-500/20 text-rose-200",
  },
];

interface SentimentSignalsPanelProps {
  trend: Array<{
    label: string;
    positive: number;
    negative: number;
    neutral: number;
  }>;
  distribution?: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const buildSparklinePoints = (values: number[]) => {
  if (values.length <= 1) {
    const single = clampPercent(values[0] ?? 0);
    return `0,${100 - single} 100,${100 - single}`;
  }
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - clampPercent(value);
      return `${x},${y}`;
    })
    .join(" ");
};

const normalizeDistribution = (slice: { positive: number; negative: number; neutral: number }) => {
  const total = slice.positive + slice.negative + slice.neutral;
  if (!total) {
    return { positive: 34, negative: 33, neutral: 33 };
  }
  return {
    positive: clampPercent((slice.positive / total) * 100),
    negative: clampPercent((slice.negative / total) * 100),
    neutral: clampPercent((slice.neutral / total) * 100),
  };
};

const SentimentSignalsPanel: React.FC<SentimentSignalsPanelProps> = ({ trend, distribution }) => {
  const recentSlices = useMemo(() => trend.slice(-10), [trend]);
  const lastKnownTrend = useMemo(() => trend[trend.length - 1], [trend]);

  const referenceDistribution = useMemo(() => {
    if (distribution) {
      return normalizeDistribution(distribution);
    }
    if (lastKnownTrend) {
      return normalizeDistribution(lastKnownTrend);
    }
    return { positive: 34, negative: 33, neutral: 33 };
  }, [distribution, lastKnownTrend]);

  const metrics = useMemo(
    () =>
      SENTIMENTS.map((sentiment) => {
        const series = recentSlices.map((point) => clampPercent(point[sentiment.key]));
        const fallbackLatest = series.length > 0 ? series[series.length - 1] : referenceDistribution[sentiment.key];
        const latest = clampPercent(referenceDistribution[sentiment.key] ?? fallbackLatest);
        const previous = series.length > 1 ? series[series.length - 2] : latest;
        const change = Number((latest - previous).toFixed(1));
        const average = series.reduce((sum, value) => sum + value, 0) / Math.max(1, series.length);
        const volatility =
          series.slice(1).reduce((sum, value, index) => sum + Math.abs(value - series[index]), 0) /
          Math.max(1, series.length - 1);

        return {
          ...sentiment,
          series,
          latest,
          previous,
          change,
          average: Number(average.toFixed(1)),
          volatility: Number(volatility.toFixed(1)),
          sparkline: buildSparklinePoints(series),
        };
      }),
    [recentSlices, referenceDistribution]
  );

  const dominant = useMemo(() => metrics.slice().sort((a, b) => b.latest - a.latest)[0], [metrics]);

  const polarizationScore = useMemo(() => {
    if (metrics.length === 0) return 0;
    const latestValues = metrics.map((item) => item.latest);
    const spread = Math.max(...latestValues) - Math.min(...latestValues);
    const avgVolatility = metrics.reduce((sum, item) => sum + item.volatility, 0) / metrics.length;
    return Math.round((spread + avgVolatility) / 2);
  }, [metrics]);

  const moodLabel =
    polarizationScore > 25 ? "Mercado polarizado" : polarizationScore > 15 ? "Humor atento" : "Sentimento equilibrado";

  const moodDescription =
    polarizationScore > 25
      ? "Os polos positivo e negativo estão disputando o noticiário — ótimo momento para identificar gatilhos de reversão."
      : polarizationScore > 15
      ? "As opiniões estão mais divididas. Traders monitoram gatilhos macro e respostas institucionais."
      : "As menções estão bem distribuídas e indicam estabilidade no curto prazo.";

  const averageShare = metrics.reduce((sum, sentiment) => sum + sentiment.latest, 0) / Math.max(1, metrics.length);
  const momentum = dominant ? Math.round(dominant.latest - averageShare) : 0;
  const balanceScore = Math.max(0, 100 - polarizationScore);

  const insightCards = [
    {
      label: "Polarização",
      value: `${polarizationScore}%`,
      hint: "Intensidade entre extremos",
      gradient: "from-emerald-400/25 via-amber-300/20 to-rose-400/25",
    },
    {
      label: "Consenso",
      value: `${balanceScore}%`,
      hint: "Probabilidade de estabilidade",
      gradient: "from-sky-400/20 via-cyan-400/10 to-indigo-500/20",
    },
    {
      label: "Momentum",
      value: `${momentum > 0 ? "+" : momentum < 0 ? "" : "±"}${momentum} pts`,
      hint: dominant ? `${dominant.label} vs média de 24h` : "Comparação com média",
      gradient: "from-fuchsia-400/20 via-purple-500/10 to-blue-500/20",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-[#0B0F1A] via-[#05060a] to-black p-5 sm:p-7 flex flex-col gap-7 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <div className="absolute -top-16 -right-20 w-72 h-72 bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-fuchsia-500/10 blur-3xl" />
      </div>

      {/* Header + Insights */}
      <div className="relative space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Pulso consolidado</p>
            <h3 className="text-2xl font-semibold text-white">{moodLabel}</h3>
          </div>

          {dominant && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Agora liderando</p>
                <p className="text-lg font-semibold text-white">
                  {dominant.label} · {Math.round(dominant.latest)}%
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-2xl text-sm font-medium ${dominant.badgeColor} border border-white/10 shadow-lg shadow-black/30`}
              >
                Top signal
              </div>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">{moodDescription}</p>

        {/* Insight Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          {insightCards.map((insight) => (
            <div
              key={insight.label}
              className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl p-4 text-white"
            >
              <div className={`absolute inset-0 opacity-70 bg-gradient-to-r ${insight.gradient}`} />
              <div className="relative space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-200/80">{insight.label}</p>
                <p className="text-2xl font-semibold">{insight.value}</p>
                <p className="text-xs text-gray-200/80">{insight.hint}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Polarization bar + dominant trend text */}
        <div className="flex flex-wrap gap-5 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Polarização</span>
            <div className="h-2 w-32 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-400"
                style={{ width: `${Math.min(100, polarizationScore)}%` }}
              />
            </div>
          </div>

          {dominant && (
            <div>
              <span className="text-gray-400">Tendência dominante:</span>{" "}
              <span className="text-white font-medium">
                {dominant.change > 0 ? "acima da média" : dominant.change < 0 ? "em retração" : "estável"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sentiment Cards with Sparklines */}
      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((item) => {
          const TrendIcon = item.change > 0.8 ? TrendingUp : item.change < -0.8 ? TrendingDown : Minus;
          const trendLabel = item.change > 0.8 ? "Acelerando" : item.change < -0.8 ? "Perdendo força" : "Estável";
          const closingX = item.sparkline.split(" ").pop()?.split(",")[0] ?? "100";

          return (
            <div
              key={item.key}
              className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-white/0 backdrop-blur-xl p-4 flex flex-col gap-4 shadow-inner shadow-black/40"
            >
              <div className={`absolute inset-x-6 top-0 h-1 bg-gradient-to-r ${item.accent}`} />

              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{item.description}</p>
                  <h4 className="text-lg font-semibold text-white">{item.label}</h4>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Agora</p>
                  <p className="text-2xl font-bold text-white">{Math.round(item.latest)}%</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Média 24h</span>
                <span className="text-white font-semibold">{item.average}%</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">Vol.</span>
                <span className="text-white font-semibold">{item.volatility}%</span>
              </div>

              {/* Sparkline */}
              <div className="h-20 relative">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <polyline
                    fill="none"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={item.lineColor}
                    points={item.sparkline}
                  />
                  <linearGradient id={`spark-${item.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                  <polyline
                    fill={`url(#spark-${item.key})`}
                    stroke="none"
                    points={`${item.sparkline} ${closingX},100 0,100`}
                    opacity={0.4}
                  />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Trend footer */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <TrendIcon
                    size={18}
                    className={item.change > 0.8 ? "text-emerald-400" : item.change < -0.8 ? "text-rose-400" : "text-gray-400"}
                  />
                  <span>{trendLabel}</span>
                </div>
                <p className="text-gray-400">
                  {item.change > 0 ? "+" : ""}
                  {item.change}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SentimentSignalsPanel;