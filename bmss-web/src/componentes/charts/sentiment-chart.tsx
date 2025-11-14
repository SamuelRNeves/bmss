"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
} from "chart.js";
import { useIsMobile } from "@/hooks/useBreakpoint";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type SentimentTrendPoint = {
  label: string;
  positive: number;
  negative: number;
  neutral: number;
};

interface SentimentChartProps {
  trend?: SentimentTrendPoint[];
}

const FALLBACK_TREND: SentimentTrendPoint[] = [
  { label: "09:00", positive: 46, negative: 32, neutral: 22 },
  { label: "10:00", positive: 51, negative: 30, neutral: 19 },
  { label: "11:00", positive: 55, negative: 27, neutral: 18 },
  { label: "12:00", positive: 60, negative: 24, neutral: 16 },
  { label: "13:00", positive: 63, negative: 22, neutral: 15 },
  { label: "14:00", positive: 67, negative: 20, neutral: 13 },
  { label: "15:00", positive: 71, negative: 18, neutral: 11 },
];

export default function SentimentChart({ trend }: SentimentChartProps) {
  const isMobile = useIsMobile();
  const points = useMemo(() => {
    const source = trend && trend.length > 0 ? trend : FALLBACK_TREND;
    return source.slice(-7);
  }, [trend]);

  const data = useMemo<ChartData<"line">>(() => ({
    labels: points.map((point) => point.label),
    datasets: [
      {
        label: "Positivo",
        data: points.map((point) => point.positive),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        fill: true,
        tension: 0.35,
        borderWidth: isMobile ? 1.5 : 2,
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: isMobile ? 3 : 4,
        pointBackgroundColor: "#10b981",
      },
      {
        label: "Negativo",
        data: points.map((point) => point.negative),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        fill: true,
        tension: 0.35,
        borderWidth: isMobile ? 1.5 : 2,
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: isMobile ? 3 : 4,
        pointBackgroundColor: "#ef4444",
      },
      {
        label: "Neutro",
        data: points.map((point) => point.neutral),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.15)",
        fill: true,
        tension: 0.35,
        borderWidth: isMobile ? 1.5 : 2,
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: isMobile ? 3 : 4,
        pointBackgroundColor: "#f59e0b",
      },
    ],
  }), [isMobile, points]);

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: isMobile
          ? {
              top: 12,
              bottom: 12,
              left: 4,
              right: 12,
            }
          : {
              top: 16,
              bottom: 16,
              left: 16,
              right: 24,
            },
      },
      plugins: {
        legend: {
          position: isMobile ? "bottom" : "top",
          labels: {
            color: "#d1d5db",
            usePointStyle: true,
            pointStyle: "circle",
            padding: isMobile ? 12 : 20,
            boxWidth: isMobile ? 8 : 12,
            font: {
              size: isMobile ? 10 : 12,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label ?? "";
              const value = context.parsed.y ?? 0;
              return `${label}: ${value.toFixed(0)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#9ca3af",
            maxTicksLimit: isMobile ? 4 : undefined,
            maxRotation: isMobile ? 0 : 0,
            font: {
              size: isMobile ? 10 : 12,
            },
          },
          grid: {
            color: "rgba(75, 85, 99, 0.2)",
          },
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            color: "#9ca3af",
            callback: (value) => `${value}%`,
            font: {
              size: isMobile ? 10 : 12,
            },
          },
          grid: {
            color: "rgba(75, 85, 99, 0.2)",
          },
        },
      },
    }),
    [isMobile]
  );

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 h-full min-w-0">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Evolução do Sentimento</h3>
      <div className="h-[18rem] sm:h-72">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}