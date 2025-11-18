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

  const moodLabel = polarizationScore > 25 ? "Mercado polarizado" : polarizationScore > 15 ? "Humor atento" : "Sentimento equilibrado";
  const moodDescription =
    polarizationScore > 25
      ? "Os polos positivo e negativo estão disputando o noticiário — ótimo momento para identificar gatilhos de reversão."
      : polarizationScore > 15
      ? "As opiniões estão mais divididas. Traders monitoram gatilhos macro e respostas institucionais."
      : "As menções estão bem distribuídas e indicam estabilidade no curto prazo.";

  return (
    <div className="bg-gradient-to-b from-neutral-900/80 via-neutral-950 to-black border border-neutral-800/70 rounded-3xl p-5 sm:p-7 flex flex-col gap-6 shadow-2xl shadow-black/40">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-gray-400">Pulso consolidado</p>
            <h3 className="text-xl font-semibold text-white">{moodLabel}</h3>
          </div>
          {dominant && (
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${dominant.badgeColor} border border-white/10 shadow-lg shadow-black/30`}>
              {dominant.label} lidera ({Math.round(dominant.latest)}%)
            </div>
          )}
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">{moodDescription}</p>
        <div className="flex items-center gap-6 text-xs text-gray-400 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm font-semibold">Polarização</span>
            <div className="h-1.5 w-24 rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400" style={{ width: `${Math.min(100, polarizationScore)}%` }} />
            </div>
            <span className="text-white text-sm font-semibold">{polarizationScore}%</span>
          </div>
          {dominant && (
            <div className="text-sm text-gray-400">
              <span className="text-gray-300 font-semibold">Tendência dominante:</span> {dominant.change > 0 ? "acima da média" : dominant.change < 0 ? "em retração" : "estável"}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((item) => {
          const TrendIcon = item.change > 0.8 ? TrendingUp : item.change < -0.8 ? TrendingDown : Minus;
          const trendLabel = item.change > 0.8 ? "Acelerando" : item.change < -0.8 ? "Perdendo força" : "Estável";
          return (
            <div key={item.key} className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 flex flex-col gap-4 shadow-inner shadow-black/30">
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${item.accent}`} />
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

              <div className="h-20">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <polyline
                    fill="none"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={item.lineColor}
                    points={item.sparkline}
                  />
                </svg>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <TrendIcon size={18} className={item.change > 0.8 ? "text-emerald-400" : item.change < -0.8 ? "text-rose-400" : "text-gray-400"} />
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
