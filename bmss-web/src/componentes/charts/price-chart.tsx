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

interface PriceData {
  time: string;
  price: number;
}

interface BitcoinPriceData {
  usd: number;
  brl: number | null;
  change24h: number;
  success: boolean;
  source: string;
  lastUpdated: string;
}

const STABLE_FALLBACK_SERIES: PriceData[] = (() => {
  const prices: PriceData[] = [];
  const now = new Date();
  const basePrice = 64500;
  const startingPrice = basePrice * 0.985;

  for (let i = 7; i >= 0; i--) {
    const pointDate = new Date(now.getTime() - i * 15 * 60 * 1000);
    const progress = (7 - i) / 7;

    const gentleTrend = startingPrice + progress * basePrice * 0.004;
    const microOscillation = Math.sin(progress * Math.PI * 2) * 40;

    const price = Number((gentleTrend + microOscillation).toFixed(2));

    prices.push({
      time: pointDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      price,
    });
  }

  return prices;
})();

export function PriceChart() {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentBitcoinData, setCurrentBitcoinData] = useState<BitcoinPriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Buscar preço atual do Bitcoin
  const fetchBitcoinPrice = async () => {
    try {
      const { getBitcoin24h } = await import('@/lib/api');
      const resultado = await getBitcoin24h();

      if (!resultado.data) {
        throw new Error(resultado.error || 'Dados indisponíveis');
      }

      const { prices, currentPriceUSD, currentPriceBRL, change24h, source, lastUpdated } = resultado.data;

      const latestPrices = prices.slice(-8).map((item: any) => ({
        time: item.time,
        price: item.price,
      }));

      setPriceData(latestPrices);
      setCurrentBitcoinData({
        usd: currentPriceUSD,
        brl: currentPriceBRL,
        change24h: Number(change24h),
        success: true,
        source,
        lastUpdated,
      });
    } catch (error) {
      console.error('Erro ao buscar preço do Bitcoin:', error);
      setPriceData((prev) =>
        prev.length > 0
          ? prev
          : STABLE_FALLBACK_SERIES
      );

      setCurrentBitcoinData((prev) =>
        prev ?? {
          usd: STABLE_FALLBACK_SERIES[STABLE_FALLBACK_SERIES.length - 1].price,
          brl: null,
          change24h: 1.2,
          success: false,
          source: 'Dados simulados',
          lastUpdated: new Date().toISOString(),
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Buscar dados iniciais
    fetchBitcoinPrice();
    
    // Configurar intervalo baseado na fonte dos dados
    const interval = setInterval(fetchBitcoinPrice, 60000); // Atualizar a cada 1 minuto
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading || priceData.length === 0 || !currentBitcoinData) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-neutral-800 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-neutral-800 rounded mb-4"></div>
          <div className="h-4 bg-neutral-800 rounded w-full"></div>
        </div>
      </div>
    );
  }

  const currentPrice = priceData[priceData.length - 1]?.price ?? 0;
  const startPrice = priceData[0]?.price ?? 0;
  const priceChange = currentPrice - startPrice;
  const percentageChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;
  const isPositive = percentageChange > 0;

  const minPrice = Math.min(...priceData.map(p => p.price));
  const maxPrice = Math.max(...priceData.map(p => p.price));

  const data = {
    labels: priceData.map(item => item.time),
    datasets: [
      {
        label: 'Preço BTC (USD)',
        data: priceData.map(item => item.price),
        borderColor: isPositive ? '#10b981' : '#ef4444',
        backgroundColor: isPositive 
          ? 'rgba(16, 185, 129, 0.1)' 
          : 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: isPositive ? '#10b981' : '#ef4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            // ✅ CORREÇÃO: Verificar se o valor não é null
            const value = context.parsed.y;
            if (value === null || value === undefined) {
              return 'Preço não disponível';
            }
            return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
          },
          title: function(tooltipItems) {
            const time = tooltipItems[0].label;
            return `Horário: ${time}`;
          }
        }
      },
      title: {
        display: true,
        text: `Variação: ${isPositive ? '+' : ''}${percentageChange.toFixed(2)}% (${isPositive ? '+' : ''}$${Math.abs(priceChange).toFixed(0)})`,
        color: isPositive ? '#10b981' : '#ef4444',
        font: {
          size: 14,
          weight: 'bold' as const
        },
        position: 'top' as const
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 6,
        },
        title: {
          display: true,
          text: 'Horário',
          color: '#9ca3af'
        }
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value) {
            if (typeof value === 'number') {
              return '$' + value.toLocaleString('en-US');
            }
            return value;
          }
        },
        title: {
          display: true,
          text: 'Preço (USD)',
          color: '#9ca3af'
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-yellow-400/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white text-lg font-semibold">
            Variação de Preço do Bitcoin
          </h3>
          <p className="text-gray-400 text-sm">
            {currentBitcoinData?.source || 'Carregando...'} • Últimas 2 horas
          </p>
        </div>
        <div className={`flex items-center gap-1 text-sm ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}>
          <span>{isPositive ? '↗' : '↘'}</span>
          <span className="font-semibold">{percentageChange.toFixed(2)}%</span>
          <span className="text-gray-400">(${Math.abs(priceChange).toFixed(0)})</span>
        </div>
      </div>
      
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
      
      <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
        <div className="text-center">
          <span className="block text-xs text-gray-500">Mínimo</span>
          <span className="text-red-400 font-semibold">${minPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        
        <div className="text-center">
          <span className="block text-xs text-gray-500">Preço Atual</span>
          <span className="text-white font-semibold">${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        
        <div className="text-center">
          <span className="block text-xs text-gray-500">Máximo</span>
          <span className="text-green-400 font-semibold">${maxPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Informações adicionais */}
      <div className="mt-4 pt-4 border-t border-neutral-700">
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
          <div>
            <span className="block text-gray-500">Variação 24h (API):</span>
            <span className={currentBitcoinData?.change24h && currentBitcoinData.change24h > 0 ? 'text-green-400' : 'text-red-400'}>
              {typeof currentBitcoinData?.change24h === 'number'
                ? `${currentBitcoinData.change24h > 0 ? '+' : ''}${currentBitcoinData.change24h.toFixed(2)}%`
                : 'N/A'}
            </span>
          </div>
          <div>
            <span className="block text-gray-500">Preço em BRL:</span>
            <span className="text-white">
              R$ {currentBitcoinData?.brl ? currentBitcoinData.brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}