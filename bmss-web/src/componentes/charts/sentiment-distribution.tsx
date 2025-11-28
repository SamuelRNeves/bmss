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
    <div className="relative overflow-hidden rounded-3xl border border-neutral-800/70 bg-gradient-to-b from-slate-950 via-neutral-950 to-black p-5 sm:p-7 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(52,211,153,0.12), transparent 35%), radial-gradient(circle at 80% 0%, rgba(248,113,113,0.14), transparent 38%)",
        }}
      />
      <div className="absolute inset-4 rounded-[26px] border border-white/5 pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white sm:text-lg">Distribuição de Sentimento</h3>
            <p className="text-xs text-gray-400">
              Visual simples para comparar força relativa entre polos
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-gray-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
            Atualiza com os dados do painel
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <div className={`relative mx-auto ${ringSize} max-w-full rounded-full bg-neutral-900/70 p-8 shadow-inner shadow-black/50`}>
            <div
              className="relative flex h-full w-full items-center justify-center rounded-full border border-white/5 bg-neutral-950"
              style={{ backgroundImage: conicGradient }}
            >
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/10 bg-black/70 text-center shadow-lg shadow-black/40">
                <span className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Liderança</span>
                <span className="text-3xl font-bold text-white">{dominant.value.toFixed(1)}%</span>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: dominant.color }}>
                  {dominant.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {segments.map((segment) => (
                <div
                  key={segment.key}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3 shadow-sm shadow-black/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="text-xs uppercase tracking-wide text-gray-400">{segment.label}</span>
                    </div>
                    <span className="text-lg font-semibold text-white">{segment.value.toFixed(1)}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-neutral-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${segment.bar}`}
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
                    className="relative rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-gray-300 backdrop-blur-sm"
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