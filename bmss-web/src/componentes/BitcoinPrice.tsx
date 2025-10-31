"use client";

import { useState, useEffect } from "react";
import { getBitcoinPrice } from "@/lib/api";
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";

interface BitcoinPriceData {
  price?: number;
  change24h?: number | string;
  priceFormatted?: string;
  isFallback?: boolean;
  currency?: string;
  lastUpdated?: any;
}

export default function BitcoinPrice() {
  const [dados, setDados] = useState<BitcoinPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarPreco = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const resultado = await getBitcoinPrice();
      
      if (resultado.data) {
        setDados(resultado.data);
      } else {
        // Fallback manual se a API falhar
        const fallbackData: BitcoinPriceData = {
          price: 64500,
          change24h: 2.3,
          priceFormatted: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
          }).format(64500),
          isFallback: true,
          currency: 'USD'
        };
        setDados(fallbackData);
        setError(resultado.error || "Usando dados simulados");
      }
    } catch (err) {
      console.error("Erro ao carregar preço:", err);
      // Fallback garantido
      const fallbackData: BitcoinPriceData = {
        price: 64500,
        change24h: 2.3,
        priceFormatted: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'USD'
        }).format(64500),
        isFallback: true,
        currency: 'USD'
      };
      setDados(fallbackData);
      setError("Erro de conexão - usando dados simulados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPreco();
    
    // Atualizar a cada 60 segundos
    const intervalo = setInterval(carregarPreco, 60000);
    return () => clearInterval(intervalo);
  }, []);

  // 🔥 CORREÇÃO: Renderização condicional mais segura
  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Bitcoin (BTC)</h3>
            <p className="text-gray-400 text-sm">Carregando preço...</p>
          </div>
          <div className="animate-spin">
            <RefreshCw size={20} className="text-yellow-400" />
          </div>
        </div>
      </div>
    );
  }

  // 🔥 CORREÇÃO: Se não há dados, mostrar fallback
  if (!dados) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Bitcoin (BTC)</h3>
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertTriangle size={14} />
              Dados indisponíveis
            </p>
            <p className="text-yellow-400 text-2xl font-bold mt-1">
              $64.500,00
            </p>
            <p className="text-gray-400 text-sm mt-1">±2.3% (24h)</p>
          </div>
          <button
            onClick={carregarPreco}
            className="bg-yellow-500 hover:bg-yellow-400 text-black p-2 rounded-lg transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 🔥 CORREÇÃO: Garantir que todos os valores existam
  const price = dados.price ?? 64500;
  const change24h = dados.change24h ?? 0;
  const isPositive = Number(change24h) > 0;
  const changeColor = isPositive ? "text-green-400" : "text-red-400";
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  // 🔥 CORREÇÃO: Formatar preço de forma segura
  const priceFormatted = dados.priceFormatted || new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD'
  }).format(price);

  const changeText = typeof change24h === 'number' 
    ? `${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%`
    : `${change24h}%`;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Bitcoin (BTC)</h3>
          <p className="text-2xl font-bold text-yellow-400">
            {priceFormatted}
          </p>
          <div className={`flex items-center gap-1 mt-1 ${changeColor}`}>
            <ChangeIcon size={16} />
            <span className="text-sm font-medium">
              {changeText} (24h)
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {(dados.isFallback || error) && (
            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} />
              {error ? "ERRO" : "CACHE"}
            </span>
          )}
          <button
            onClick={carregarPreco}
            className="bg-yellow-500 hover:bg-yellow-400 text-black p-2 rounded-lg transition"
            title="Atualizar Preço"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {error && (
        <p className="text-orange-400 text-xs mt-2 flex items-center gap-1">
          <AlertTriangle size={10} />
          {error}
        </p>
      )}
    </div>
  );
}