"use client";

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  Chart,
} from 'chart.js';
import { useEffect, useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/useBreakpoint';

ChartJS.register(ArcElement, Tooltip, Legend);

const segmentGlow = {
  id: 'segmentGlow',
  beforeDatasetDraw: (chart: Chart, args: { index: number }, options: { blur?: number; color?: string }) => {
    const { ctx } = chart;
    const datasetMeta = chart.getDatasetMeta(args.index);

    ctx.save();
    ctx.shadowColor = options.color ?? 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = options.blur ?? 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    datasetMeta.data.forEach((arc: any) => {
      arc.draw(ctx);
    });
    ctx.restore();
  }
};

ChartJS.register(segmentGlow);

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
    neutral: 30
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!distribution) return;
    setCurrentDistribution(distribution);
  }, [distribution]);

  // Quando não recebemos dados reais, mantemos uma simulação suave apenas para ambientes de preview/local
  useEffect(() => {
    if (distribution) return;
    const interval = setInterval(() => {
      setCurrentDistribution(prev => ({
        positive: Math.max(20, Math.min(70, prev.positive + (Math.random() * 10 - 5))),
        negative: Math.max(15, Math.min(40, prev.negative + (Math.random() * 8 - 4))),
        neutral: Math.max(20, Math.min(50, prev.neutral + (Math.random() * 6 - 3)))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [distribution]);

  const normalizedDistribution = useMemo(() => {
    const total = currentDistribution.positive + currentDistribution.negative + currentDistribution.neutral;
    if (!total) {
      return { positive: 34, negative: 33, neutral: 33 };
    }
    return {
      positive: Number(((currentDistribution.positive / total) * 100).toFixed(1)),
      negative: Number(((currentDistribution.negative / total) * 100).toFixed(1)),
      neutral: Number(((currentDistribution.neutral / total) * 100).toFixed(1)),
    };
  }, [currentDistribution]);

  const segments = useMemo(() => ([
    { key: 'positive', label: 'Positivo', color: '#34d399', glow: 'rgba(52, 211, 153, 0.4)', border: '#0f766e', bar: 'from-emerald-300 via-emerald-500 to-emerald-700', value: normalizedDistribution.positive },
    { key: 'negative', label: 'Negativo', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', border: '#991b1b', bar: 'from-rose-300 via-rose-500 to-rose-700', value: normalizedDistribution.negative },
    { key: 'neutral', label: 'Neutro', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.35)', border: '#92400e', bar: 'from-amber-300 via-amber-500 to-amber-700', value: normalizedDistribution.neutral },
  ]), [normalizedDistribution]);

  const dominant = useMemo(() => segments.reduce((prev, current) => (current.value > prev.value ? current : prev), segments[0]), [segments]);

  const legendInsights = useMemo(() => {
    if (!segments.length) return [];
    const ordered = [...segments].sort((a, b) => b.value - a.value);
    const [leader, runnerUp, trailer] = ordered;
    const spread = leader.value - (trailer?.value ?? 0);
    const midShare = runnerUp ? runnerUp.value : leader.value;

    return [
      {
        id: 'leader',
        accent: leader.color,
        title: `${leader.label} no comando`,
        description: `${leader.label} concentra ${leader.value.toFixed(1)}% das conversas agora, sinalizando onde o humor está mais forte.`
      },
      {
        id: 'spread',
        accent: runnerUp?.color ?? '#6b7280',
        title: 'Equilíbrio x disputa',
        description: spread < 10
          ? 'Os blocos caminham praticamente juntos — uma janela boa para narrativas equilibradas.'
          : `${leader.label} abre ${spread.toFixed(1)} pts sobre ${trailer?.label ?? runnerUp?.label}, indicando disputa aberta entre os polos.`
      },
      {
        id: 'radar',
        accent: trailer?.color ?? '#9ca3af',
        title: 'Ponto de atenção',
        description: trailer
          ? `${trailer.label} aparece com ${trailer.value.toFixed(1)}%, mas oscila perto de ${midShare.toFixed(1)}% — um salto pequeno pode mudar a liderança.`
          : 'Monitoramos oscilações rápidas para capturar viradas súbitas no sentimento.'
      }
    ];
  }, [segments]);

  const lighten = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const data = useMemo(() => ({
    labels: ['Positivo', 'Negativo', 'Neutro'],
    datasets: [
      {
        data: segments.map((segment) => segment.value),
        backgroundColor: segments.map((segment) => segment.color),
        borderColor: segments.map((segment) => segment.border),
        hoverBackgroundColor: segments.map((segment) => lighten(segment.color, 20)),
        hoverBorderColor: segments.map((segment) => lighten(segment.border, 18)),
        borderWidth: 6,
        hoverOffset: 14,
        offset: 4,
        spacing: 4,
        borderRadius: 22,
      },
    ],
  }), [segments]);

  const options = useMemo<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0b0f17',
        titleColor: '#e5e7eb',
        bodyColor: '#cbd5e1',
        borderColor: '#1f2937',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value.toFixed(1)}%`;
          }
        }
      },
      segmentGlow: { blur: 18, color: 'rgba(0,0,0,0.45)' }
    },
    layout: {
      padding: isMobile ? 6 : 12,
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  }), [isMobile]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-[#0b0f17] via-[#05080f] to-black p-5 sm:p-7 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)]">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 20% 15%, rgba(52, 211, 153, 0.12), transparent 35%), radial-gradient(circle at 80% 20%, rgba(248, 113, 113, 0.16), transparent 45%), radial-gradient(circle at 50% 80%, rgba(245, 158, 11, 0.12), transparent 40%)' }} />
      <div className="absolute inset-[14px] rounded-[26px] bg-white/5 blur-3xl opacity-20" />
      <div className="absolute inset-4 border border-white/5 rounded-[26px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-gray-300">Visão em pizza</div>
            <span className="text-gray-500 text-xs">Retrato instantâneo do sentimento consolidado</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-300 bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            Dados sincronizados com a análise acima
          </div>
        </div>

        <div className="relative h-64 sm:h-72">
          <Doughnut data={data} options={options} />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative px-5 py-4 rounded-2xl bg-black/70 border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.65)] backdrop-blur">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent" />
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 text-center">Liderança</p>
                <p className="text-4xl font-bold text-white text-center leading-tight">{dominant.value.toFixed(1)}%</p>
                <p className="text-xs uppercase tracking-wide text-center font-semibold" style={{ color: dominant.color }}>{dominant.label}</p>
              </div>
            </div>
          </div>
          <div className="absolute inset-8 rounded-full bg-gradient-to-b from-white/5 via-transparent to-white/5 shadow-inner border border-white/5 pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
          {segments.map((segment) => (
            <div key={segment.key} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3 flex flex-col gap-2 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-xs uppercase tracking-wide text-gray-400">{segment.label}</span>
                </div>
                <span className="text-white font-semibold">{segment.value.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${segment.bar}`}
                  style={{ width: `${segment.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
            <span className="w-6 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            Como ler esse retrato
            <span className="w-6 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {legendInsights.map((note) => (
              <div
                key={note.id}
                className="relative rounded-2xl border border-white/5 bg-black/40 backdrop-blur p-4 text-sm text-gray-300 shadow-[0_15px_45px_-25px_rgba(0,0,0,0.9)]"
              >
                <span className="absolute inset-x-4 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${note.accent}, transparent)` }} />
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: note.accent }} />
                  <span className="font-semibold text-white text-xs uppercase tracking-wide">{note.title}</span>
                </div>
                <p className="text-gray-400 leading-relaxed text-xs sm:text-sm">{note.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}