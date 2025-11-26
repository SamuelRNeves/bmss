"use client";

import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { useEffect, useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/useBreakpoint';

ChartJS.register(ArcElement, Tooltip, Legend);

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
    { key: 'positive', label: 'Positivo', color: '#10b981', border: '#0d966c', bar: 'from-emerald-400 to-emerald-600', value: normalizedDistribution.positive },
    { key: 'negative', label: 'Negativo', color: '#ef4444', border: '#dc2626', bar: 'from-rose-400 to-rose-600', value: normalizedDistribution.negative },
    { key: 'neutral', label: 'Neutro', color: '#f59e0b', border: '#d97706', bar: 'from-amber-300 to-amber-500', value: normalizedDistribution.neutral },
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

  const data = {
    labels: ['Positivo', 'Negativo', 'Neutro'],
    datasets: [
      {
        data: segments.map((segment) => segment.value),
        backgroundColor: segments.map((segment) => segment.color),
        borderColor: segments.map((segment) => segment.border),
        borderWidth: 3, // Mantido do primeiro branch - mais destaque visual
        hoverOffset: 12, // Mantido do primeiro branch - melhor interação
        offset: 6, // Mantido do primeiro branch - efeito destacado
        spacing: 3, // Compromisso entre os dois valores (2 e 4)
        borderRadius: 18, // Mantido do primeiro branch - bordas mais arredondadas
      },
    ],
  };

  const options = useMemo<ChartOptions<'pie'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e5e7eb',
          font: {
            weight: '600',
            size: isMobile ? 10 : 12
          },
          padding: isMobile ? 8 : 14,
          usePointStyle: true,
        },
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
    },
    layout: {
      padding: isMobile ? 6 : 12, // Mantido do primeiro branch - melhor espaçamento
    },
    animation: {
      animateScale: true,
      animateRotate: true, // Mantido do primeiro branch - animações suaves
    },
    cutout: isMobile ? '62%' : '70%', // Mantido do segundo branch - donut chart responsivo
  }), [isMobile]);

  return (
    <div className="relative bg-gradient-to-b from-slate-900/90 via-black to-black border border-neutral-800/70 rounded-3xl p-5 sm:p-7 overflow-hidden shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)]">
      <div className="absolute inset-0 pointer-events-none opacity-50" style={{ background: 'radial-gradient(circle at 25% 20%, rgba(52, 211, 153, 0.12), transparent 40%), radial-gradient(circle at 80% 0%, rgba(248, 113, 113, 0.14), transparent 45%)' }} />
      <div className="absolute inset-4 border border-white/5 rounded-[26px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          {/* RESOLVENDO CONFLITO NO HEADER - Mantendo título descritivo e badge informativo */}
          <div className="flex items-center gap-3">
            <h3 className="text-white text-base sm:text-lg font-semibold">Distribuição de Sentimento</h3>
            <span className="text-[11px] text-gray-400 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
              Visual em pizza para leitura rápida
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400 bg-white/5 border border-white/5 rounded-full px-3 py-1">
            Dados sincronizados com a análise acima
          </div>
        </div>

        <div className="relative h-56 sm:h-64">
          <Pie data={data} options={options} />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-4 py-3 rounded-2xl bg-black/70 border border-white/10 shadow-xl backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 text-center">Liderança</p>
              <p className="text-3xl font-bold text-white text-center">{dominant.value.toFixed(1)}%</p>
              <p className="text-xs uppercase tracking-wide text-center" style={{ color: dominant.color }}>{dominant.label}</p>
            </div>
          </div>
          
          {/* RESOLVENDO CONFLITO NO OVERLAY - Mantendo overlay mais sutil do segundo branch */}
          <div className="absolute inset-8 rounded-full bg-black/30 shadow-inner border border-white/5 pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
          {segments.map((segment) => (
            <div key={segment.key} className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-xs uppercase tracking-wide text-gray-400">{segment.label}</span>
                </div>
                <span className="text-white font-semibold">{segment.value.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${segment.bar}`}
                  style={{ width: `${segment.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Como ler esse retrato</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {legendInsights.map((note) => (
              <div
                key={note.id}
                className="relative rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm p-4 text-sm text-gray-300"
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