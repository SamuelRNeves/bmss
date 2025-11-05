"use client";

import { useEffect, useState } from "react";
import { Bitcoin, TrendingUp, TrendingDown, RefreshCw, WifiOff } from "lucide-react";

interface BitcoinData {
  usd: number;
  brl: number;
  change24h: number;
  success: boolean;
  source: string;
  lastUpdated: string;
}

export function BitcoinPrice() {
  const [bitcoinData, setBitcoinData] = useState<BitcoinData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? "http://localhost:8080/api/v1" : undefined);

  const fetchBitcoinPrice = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      if (!API_BASE_URL) {
        throw new Error("API base URL não configurada");
      }

      const response = await fetch(`${API_BASE_URL}/crypto/bitcoin`);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      setBitcoinData(data);
      
    } catch (error) {
      console.error('Erro ao buscar preço do Bitcoin:', error);
      setError('Erro ao carregar dados do Bitcoin');
      
      // Fallback mínimo
      setBitcoinData({
        usd: 45000,
        brl: 225000,
        change24h: 0,
        success: false,
        source: "Erro",
        lastUpdated: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBitcoinPrice();
    const interval = setInterval(fetchBitcoinPrice, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/20 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-yellow-400/20 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-yellow-400/20 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-yellow-400/20 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error && !bitcoinData) {
    return (
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-400/20 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <WifiOff className="text-red-400" size={24} />
          <div>
            <p className="text-white font-semibold">Erro de Conexão</p>
            <p className="text-gray-400 text-sm">Não foi possível conectar à API</p>
          </div>
        </div>
      </div>
    );
  }

  if (!bitcoinData) {
    return (
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/20 rounded-xl p-6">
        <div className="text-center text-gray-400">
          Dados do Bitcoin não disponíveis
        </div>
      </div>
    );
  }

  const isPositive = bitcoinData.change24h > 0;

  return (
    <div className={`border rounded-xl p-6 transition-all duration-300 ${
      bitcoinData.success 
        ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-400/20 hover:border-yellow-400/40' 
        : 'bg-gradient-to-r from-gray-500/10 to-gray-600/10 border-gray-400/20'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Bitcoin className="text-yellow-400" size={20} />
            <span className="text-gray-400 text-sm">Bitcoin (BTC)</span>
            <button
              onClick={fetchBitcoinPrice}
              disabled={isRefreshing}
              className="text-gray-400 hover:text-yellow-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
            {!bitcoinData.success && (
              <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                Dados Mock
              </span>
            )}
          </div>
          
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-white">
              ${bitcoinData.usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <div className={`flex items-center gap-1 text-sm ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{Math.abs(bitcoinData.change24h).toFixed(2)}%</span>
            </div>
          </div>

          <p className="text-gray-400 text-sm">
            R$ {bitcoinData.brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Fonte: {bitcoinData.source}</p>
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            bitcoinData.success ? 'bg-green-400' : 'bg-yellow-400'
          }`}></div>
        </div>
      </div>
    </div>
  );
}