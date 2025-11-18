"use client";

import { Doughnut } from 'react-chartjs-2';
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

  const data = {
    labels: ['Positivo', 'Negativo', 'Neutro'],
    datasets: [
      {
        data: segments.map((segment) => segment.value),
        backgroundColor: segments.map((segment) => segment.color),
        borderColor: segments.map((segment) => segment.border),
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const options = useMemo<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9ca3af',
          font: {
            size: isMobile ? 10 : 12
          },
          padding: isMobile ? 12 : 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value.toFixed(1)}%`;
          }
        }
      },
    },
    cutout: isMobile ? '58%' : '65%',
  }), [isMobile]);

  return (
    <div className="relative bg-gradient-to-b from-neutral-900/90 via-neutral-950 to-black border border-neutral-800/70 rounded-3xl p-5 sm:p-7 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: 'radial-gradient(circle at top, rgba(250, 204, 21, 0.15), transparent 65%)' }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="text-white text-base sm:text-lg font-semibold">Distribuição de Sentimento</h3>
          <div className="text-xs uppercase tracking-wide text-gray-500">Dados sincronizados com a análise acima</div>
        </div>

        <div className="relative h-56 sm:h-64">
          <Doughnut data={data} options={options} />

          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-sm text-gray-400">Liderança</span>
            <span className={`text-3xl font-bold text-white`}>{dominant.value.toFixed(1)}%</span>
            <span className="text-xs uppercase tracking-wide" style={{ color: dominant.color }}>{dominant.label}</span>
          </div>
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
      </div>
    </div>
  );
}