"use client";

import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/useBreakpoint";

interface SentimentDistributionProps {
  distribution?: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export function SentimentDistribution({ distribution }: SentimentDistributionProps) {
  const [currentDistribution, setCurrentDistribution] = useState({
    positive: 45,
    negative: 25,
    neutral: 30,
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    if (distribution) {
      setCurrentDistribution(distribution);
    }
  }, [distribution]);

  const normalizedDistribution = useMemo(() => {
    const total =
      currentDistribution.positive + currentDistribution.negative + currentDistribution.neutral;
    if (!total) {
      return { positive: 34, negative: 33, neutral: 33 };
    }

    const formatValue = (value: number) => Number(((value / total) * 100).toFixed(1));

    return {
      positive: formatValue(currentDistribution.positive),
      negative: formatValue(currentDistribution.negative),
      neutral: formatValue(currentDistribution.neutral),
    };
  }, [currentDistribution]);

  const segments = useMemo(
    () => [
      {
        key: "positive",
        label: "Positivo",
        color: "#10b981",
        bar: "from-emerald-400 to-emerald-600",
        value: normalizedDistribution.positive,
      },
      {
        key: "negative",
        label: "Negativo",
        color: "#ef4444",
        bar: "from-rose-400 to-rose-600",
        value: normalizedDistribution.negative,
      },
      {
        key: "neutral",
        label: "Neutro",
        color: "#f59e0b",
        bar: "from-amber-300 to-amber-500",
        value: normalizedDistribution.neutral,
      },
    ],
    [normalizedDistribution]
  );

  const dominant = useMemo(
    () => segments.reduce((prev, current) => (current.value > prev.value ? current : prev), segments[0]),
    [segments]
  );

  const legendInsights = useMemo(() => {
    if (!segments.length) return [];
    const ordered = [...segments].sort((a, b) => b.value - a.value);
    const [leader, runnerUp, trailer] = ordered;
    const spread = leader.value - (trailer?.value ?? 0);
    const midShare = runnerUp ? runnerUp.value : leader.value;

    return [
      {
        id: "leader",
        accent: leader.color,
        title: `${leader.label} no comando`,
        description: `${leader.label} concentra ${leader.value.toFixed(
          1
        )}% das conversas agora, sinalizando onde o humor está mais forte.`,
      },
      {
        id: "spread",
        accent: runnerUp?.color ?? "#6b7280",
        title: "Equilíbrio x disputa",
        description:
          spread < 10
            ? "Os blocos caminham praticamente juntos — uma janela boa para narrativas equilibradas."
            : `${leader.label} abre ${spread.toFixed(1)} pts sobre ${
                trailer?.label ?? runnerUp?.label
              }, indicando disputa aberta entre os polos.`,
      },
      {
        id: "radar",
        accent: trailer?.color ?? "#9ca3af",
        title: "Ponto de atenção",
        description: trailer
          ? `${trailer.label} aparece com ${trailer.value.toFixed(
              1
            )}%, mas oscila perto de ${midShare.toFixed(
              1
            )}% — um salto pequeno pode mudar a liderança.`
          : "Monitoramos oscilações rápidas para capturar viradas súbitas no sentimento.",
      },
    ];
  }, [segments]);

  const conicGradient = useMemo(() => {
    const positiveAngle = (normalizedDistribution.positive / 100) * 360;
    const neutralAngle = (normalizedDistribution.neutral / 100) * 360;
    const negativeAngle = 360 - positiveAngle - neutralAngle;

    return `conic-gradient(#10b981 0deg ${positiveAngle.toFixed(
      2
    )}deg, #f59e0b ${positiveAngle.toFixed(2)}deg ${(positiveAngle + neutralAngle).toFixed(
      2
    )}deg, #ef4444 ${(positiveAngle + neutralAngle).toFixed(2)}deg ${(positiveAngle + neutralAngle + negativeAngle).toFixed(
      2
    )}deg)`;
  }, [normalizedDistribution.neutral, normalizedDistribution.positive]);

  const ringSize = isMobile ? "h-56 w-56" : "h-64 w-64";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-slate-950 via-slate-950/70 to-black p-5 sm:p-7 shadow-[0_22px_90px_-50px_rgba(0,0,0,0.9)]">
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(52,211,153,0.12), transparent 32%), radial-gradient(circle at 80% 0%, rgba(245,158,11,0.12), transparent 35%), radial-gradient(circle at 50% 120%, rgba(99,102,241,0.08), transparent 35%)",
      }} />
      <div className="absolute inset-4 rounded-[26px] border border-white/5 pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-sky-100/80 ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Retrato em tempo real
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Distribuição de Sentimento</h3>
              <p className="text-sm text-gray-400">Visual limpo para enxergar qual humor está liderando.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm shadow-lg shadow-black/20">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Maior fatia</p>
              <p className="text-base font-semibold text-white">{dominant.label}</p>
              <p className="text-lg font-bold" style={{ color: dominant.color }}>
                {dominant.value.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 items-center lg:grid-cols-[minmax(280px,340px),1fr]">
          <div className="relative mx-auto">
            <div className={`relative ${ringSize} max-w-full`}>
              <div className="absolute inset-4 rounded-full bg-gradient-to-b from-white/10 to-transparent blur-3xl" />
              <div
                className="relative flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-black/60 shadow-[0_25px_80px_-60px_rgba(0,0,0,0.9)]"
                style={{ backgroundImage: conicGradient }}
              >
                <div className="absolute inset-6 rounded-full border border-white/10 opacity-60" />
                <div className="absolute inset-9 rounded-full bg-black/70 backdrop-blur-sm" />
                <div className="relative flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-full border border-white/15 bg-black/70 text-center shadow-lg shadow-black/50">
                  <span className="text-[11px] uppercase tracking-[0.25em] text-gray-400">Liderança</span>
                  <span className="text-3xl font-bold text-white">{dominant.value.toFixed(1)}%</span>
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: dominant.color }}>
                    {dominant.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {segments.map((segment) => (
                <div
                  key={segment.key}
                  className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-3 shadow-sm shadow-black/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="text-xs uppercase tracking-wide text-gray-300">{segment.label}</span>
                    </div>
                    <span className="text-lg font-semibold text-white">{segment.value.toFixed(1)}%</span>
                  </div>
                  <div className="relative mt-3 h-2 rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${segment.bar} shadow-[0_0_0_1px_rgba(255,255,255,0.06)]`}
                      style={{ width: `${segment.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Como ler esse retrato</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {legendInsights.map((note) => (
                  <div
                    key={note.id}
                    className="relative rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-gray-300 backdrop-blur-sm"
                  >
                    <span
                      className="absolute inset-x-4 top-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${note.accent}, transparent)` }}
                    />
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: note.accent }} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-white">{note.title}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-400 sm:text-sm">{note.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
