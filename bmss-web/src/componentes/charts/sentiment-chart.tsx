// componentes/charts/SentimentChart.tsx
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
} from 'chart.js';
import { useEffect, useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function SentimentChart() {
  const [data, setData] = useState({
    labels: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    datasets: [
      {
        label: 'Positivo',
        data: [45, 52, 48, 65, 70, 68, 72],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
      },
      {
        label: 'Negativo',
        data: [30, 25, 28, 20, 18, 22, 15],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
      },
      {
        label: 'Neutro',
        data: [25, 23, 24, 15, 12, 10, 13],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
      },
    ],
  });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Evolução do Sentimento</h3>
      <Line data={data} options={{
        responsive: true,
        plugins: { legend: { position: 'top' as const } },
        scales: { y: { min: 0, max: 100 } }
      }} />
    </div>
  );
}