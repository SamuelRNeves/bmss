"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, RefreshCw, Bitcoin } from "lucide-react";

interface BitcoinData {
  usd: number;
  brl: number;
  change24h: number;
  lastUpdated: string;
  source: string;
  success: boolean;
}

export default function BitcoinPrice() {
  const [bitcoinData, setBitcoinData] = useState<BitcoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBitcoinPrice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("http://localhost:8080/api/v1/crypto/bitcoin");
      const data = await response.json();
      
      if (data.success === false) {
        throw new Error("Falha ao carregar dados do Bitcoin");
      }
      
      setBitcoinData(data);
    } catch (err) {
      console.error("❌ Erro ao buscar cotação do Bitcoin:", err);
      setError("Erro ao carregar cotação");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBitcoinPrice();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchBitcoinPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-neutral-900 border border-neutral-800 rounded-xl p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Bitcoin size={20} className="text-yellow-500" />
            </div>
            <div>
              <div className="h-4 bg-neutral-800 rounded w-24 mb-2"></div>
              <div className="h-3 bg-neutral-800 rounded w-16"></div>
            </div>
          </div>
          <RefreshCw size={16} className="text-gray-500 animate-spin" />
        </div>
      </motion.div>
    );
  }

  if (error || !bitcoinData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-neutral-900 border border-neutral-800 rounded-xl p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Bitcoin size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-gray-100 font-medium">Bitcoin</p>
              <p className="text-gray-400 text-sm">Falha ao carregar</p>
            </div>
          </div>
          <button
            onClick={fetchBitcoinPrice}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className="text-gray-400" />
          </button>
        </div>
      </motion.div>
    );
  }

  const isPositive = bitcoinData.change24h > 0;
  const changeColor = isPositive ? "text-green-400" : "text-red-400";
  const changeBgColor = isPositive ? "bg-green-500/20" : "bg-red-500/20";
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <Bitcoin size={20} className="text-yellow-500" />
          </div>
          <div>
            <p className="text-gray-100 font-medium">Bitcoin (BTC)</p>
            <p className="text-gray-400 text-xs">
              Via {bitcoinData.source} • {new Date(bitcoinData.lastUpdated).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchBitcoinPrice}
          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          title="Atualizar cotação"
        >
          <RefreshCw size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Preço em USD */}
        <div>
          <p className="text-gray-400 text-sm mb-1">USD</p>
          <p className="text-xl font-bold text-gray-100">
            ${bitcoinData.usd.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>

        {/* Preço em BRL */}
        <div>
          <p className="text-gray-400 text-sm mb-1">BRL</p>
          <p className="text-xl font-bold text-gray-100">
            R${bitcoinData.brl.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
      </div>

      {/* Variação 24h */}
      <div className="mt-3 flex items-center justify-between">
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${changeBgColor} ${changeColor}`}>
          <ChangeIcon size={14} />
          <span className="text-sm font-medium">
            {isPositive ? '+' : ''}{bitcoinData.change24h.toFixed(2)}%
          </span>
        </div>
        <span className="text-xs text-gray-500">24h</span>
      </div>
    </motion.div>
  );
}