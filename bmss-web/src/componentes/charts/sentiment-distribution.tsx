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

  // Usar dados passados como props ou dados simulados
  useEffect(() => {
    if (distribution) {
      setCurrentDistribution(distribution);
    } else {
      // Simular atualização dos dados se não vier por props
      const interval = setInterval(() => {
        setCurrentDistribution(prev => ({
          positive: Math.max(20, Math.min(70, prev.positive + (Math.random() * 10 - 5))),
          negative: Math.max(15, Math.min(40, prev.negative + (Math.random() * 8 - 4))),
          neutral: Math.max(20, Math.min(50, prev.neutral + (Math.random() * 6 - 3)))
        }));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [distribution]);

  const data = {
    labels: ['Positivo', 'Negativo', 'Neutro'],
    datasets: [
      {
        data: [currentDistribution.positive, currentDistribution.negative, currentDistribution.neutral],
        backgroundColor: [
          '#10b981', // Verde
          '#ef4444', // Vermelho
          '#f59e0b', // Amarelo
        ],
        borderColor: [
          '#0d966c',
          '#dc2626',
          '#d97706',
        ],
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

  const total = currentDistribution.positive + currentDistribution.negative + currentDistribution.neutral;
  const positivePercentage = total > 0 ? ((currentDistribution.positive / total) * 100) : 0;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 hover:border-yellow-400/30 transition-all duration-300">
      <h3 className="text-white text-base sm:text-lg font-semibold mb-4 text-center">
        Distribuição de Sentimento
      </h3>

      <div className="relative h-56 sm:h-64">
        <Doughnut data={data} options={options} />

        {/* Centro do gráfico com porcentagem principal */}
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-xl sm:text-2xl font-bold text-white">{positivePercentage.toFixed(1)}%</span>
          <span className="text-xs sm:text-sm text-green-400">Positivo</span>
        </div>
      </div>

      {/* Estatísticas detalhadas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-white font-semibold">{currentDistribution.positive.toFixed(1)}%</span>
          </div>
          <span className="text-[11px] sm:text-xs text-gray-400">Positivo</span>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-white font-semibold">{currentDistribution.negative.toFixed(1)}%</span>
          </div>
          <span className="text-[11px] sm:text-xs text-gray-400">Negativo</span>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-white font-semibold">{currentDistribution.neutral.toFixed(1)}%</span>
          </div>
          <span className="text-[11px] sm:text-xs text-gray-400">Neutro</span>
        </div>
      </div>
    </div>
  );
}