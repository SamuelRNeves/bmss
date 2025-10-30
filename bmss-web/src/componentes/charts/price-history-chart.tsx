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

interface HistoricalPrice {
  timestamp: string;
  price: number;
  volume: number;
}

export function PriceHistoryChart() {
  const [historicalData, setHistoricalData] = useState<HistoricalPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simular dados históricos das últimas 24h
  useEffect(() => {
    const generateHistoricalData = () => {
      const data: HistoricalPrice[] = [];
      const basePrice = 67000;
      const now = new Date();
      
      // Gerar dados para as últimas 24 horas (24 pontos - 1 por hora)
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
        
        // Variação mais realista com tendência
        const randomVariation = (Math.random() - 0.5) * 0.04; // ±2%
        const trend = Math.sin(i * 0.3) * 0.02; // Tendência senoidal
        const price = basePrice * (1 + randomVariation + trend);
        
        data.push({
          timestamp: time.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
          }),
          price: price,
          volume: 1000 + Math.random() * 5000
        });
      }
      
      return data;
    };

    setHistoricalData(generateHistoricalData());
    setIsLoading(false);

    // Atualizar a cada 5 minutos
    const interval = setInterval(() => {
      setHistoricalData(prev => {
        const newData = [...prev];
        const lastPrice = newData[newData.length - 1].price;
        const variation = (Math.random() - 0.5) * 0.01; // ±0.5%
        
        newData.push({
          timestamp: new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          price: lastPrice * (1 + variation),
          volume: 1000 + Math.random() * 5000
        });
        
        return newData.slice(-24); // Manter 24 pontos
      });
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div className="animate-pulse bg-neutral-800 rounded-xl h-64"></div>;
  }

  const currentPrice = historicalData.length > 0 ? historicalData[historicalData.length - 1].price : 0;
  const startPrice = historicalData.length > 0 ? historicalData[0].price : 0;
  const priceChange = currentPrice - startPrice;
  const percentageChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;
  const isPositive = percentageChange > 0;

  const data = {
    labels: historicalData.map(item => item.timestamp),
    datasets: [
      {
        label: 'Preço BTC (USD)',
        data: historicalData.map(item => item.price),
        borderColor: isPositive ? '#10b981' : '#ef4444',
        backgroundColor: isPositive 
          ? 'rgba(16, 185, 129, 0.1)' 
          : 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Volume (em milhares)',
        data: historicalData.map(item => item.volume / 1000),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.4,
        borderWidth: 1,
        yAxisID: 'y1',
        borderDash: [5, 5],
      }
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Horário'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Preço (USD)'
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString('en-US');
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Volume (mil)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: `Variação 24h: ${isPositive ? '+' : ''}${percentageChange.toFixed(2)}%`
      }
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <h3 className="text-white text-lg font-semibold mb-4">
        Variação de Preço - Últimas 24h
      </h3>
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}