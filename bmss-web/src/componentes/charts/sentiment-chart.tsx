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
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#10b981",
      },
      {
        label: "Negativo",
        data: points.map((point) => point.negative),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#ef4444",
      },
      {
        label: "Neutro",
        data: points.map((point) => point.neutral),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.15)",
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#f59e0b",
      },
    ],
  }), [points]);

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#d1d5db",
            usePointStyle: true,
            pointStyle: "circle",
            padding: 20,
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
          },
          grid: {
            color: "rgba(75, 85, 99, 0.2)",
          },
        },
      },
    }),
    []
  );

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-full">
      <h3 className="text-xl font-bold text-white mb-4">Evolução do Sentimento</h3>
      <div className="h-72">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}