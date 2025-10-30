"use client";

import { Line } from 'react-chartjs-2';
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
  ChartOptions
} from 'chart.js';
import { useEffect, useState } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SentimentData {
  hour: string;
  positive: number;
  negative: number;
  neutral: number;
}

export function SentimentChart() {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);

  useEffect(() => {
    // Simular dados de sentimento ao longo do tempo
    const generateSentimentData = () => {
      const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
      return hours.map((hour, index) => ({
        hour,
        positive: 40 + Math.random() * 30,
        negative: 20 + Math.random() * 25,
        neutral: 30 + Math.random() * 20
      }));
    };

    setSentimentData(generateSentimentData());
  }, []);

  const data = {
    labels: sentimentData.map(item => item.hour),
    datasets: [
      {
        label: 'Positivo',
        data: sentimentData.map(item => item.positive),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Negativo',
        data: sentimentData.map(item => item.negative),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Neutro',
        data: sentimentData.map(item => item.neutral),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: {
            size: 12
          }
        },
      },
      title: {
        display: true,
        text: 'Evolução do Sentimento ao Longo do Dia',
        color: '#f3f4f6',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value) {
            return value + '%';
          }
        },
        min: 0,
        max: 100,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-yellow-400/30 transition-all duration-300">
      <Line data={data} options={options} />
    </div>
  );
}