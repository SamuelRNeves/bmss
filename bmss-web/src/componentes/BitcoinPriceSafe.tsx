"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";

// Interface segura com valores padrão
interface BitcoinPriceData {
  price: number;
  change24h: string;
  priceFormatted: string;
  isFallback: boolean;
  currency: string;
}

// Dados fallback garantidos
const FALLBACK_DATA: BitcoinPriceData = {
  price: 64500,
  change24h: "2.30",
  priceFormatted: "US$ 64.500,00",
  isFallback: true,
  currency: "USD"
};

export default function BitcoinPriceSafe() {
  const [dados, setDados] = useState<BitcoinPriceData>(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função segura para formatar preço
  const formatarPreco = (price: number): string => {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD'
      }).format(price);
    } catch (err) {
      return `$${price.toLocaleString('pt-BR')}`;
    }
  };

  const carregarPreco = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Importação dinâmica para evitar problemas de build
      const { getBitcoinPrice } = await import("@/lib/api");
      const resultado = await getBitcoinPrice();
      
      if (resultado.data) {
        // Garantir que todos os campos existam
        const dadosSeguros: BitcoinPriceData = {
          price: resultado.data.price || FALLBACK_DATA.price,
          change24h: resultado.data.change24h?.toString() || FALLBACK_DATA.change24h,
          priceFormatted: resultado.data.priceFormatted || formatarPreco(resultado.data.price || FALLBACK_DATA.price),
          isFallback: resultado.data.isFallback || false,
          currency: resultado.data.currency || 'USD'
        };
        setDados(dadosSeguros);
      } else {
        setDados(FALLBACK_DATA);
        setError(resultado.error || "Usando dados simulados");
      }
    } catch (err) {
      console.error("Erro ao carregar preço:", err);
      setDados(FALLBACK_DATA);
      setError("Erro de conexão - usando dados simulados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPreco();
    
    const intervalo = setInterval(carregarPreco, 60000);
    return () => clearInterval(intervalo);
  }, []);

  // Dados sempre garantidos - mesmo se loading ou error
  const { price, change24h, priceFormatted, isFallback } = dados;
  
  const isPositive = parseFloat(change24h) > 0;
  const changeColor = isPositive ? "text-green-400" : "text-red-400";
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Bitcoin (BTC)</h3>
          
          {loading ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="animate-pulse bg-yellow-400/20 h-8 w-32 rounded"></div>
              <div className="animate-spin">
                <RefreshCw size={16} className="text-yellow-400" />
              </div>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-yellow-400">
                {priceFormatted}
              </p>
              <div className={`flex items-center gap-1 mt-1 ${changeColor}`}>
                <ChangeIcon size={16} />
                <span className="text-sm font-medium">
                  {change24h}% (24h)
                </span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {(isFallback || error) && (
            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} />
              {error ? "ERRO" : "CACHE"}
            </span>
          )}
          <button
            onClick={carregarPreco}
            disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-700 text-black p-2 rounded-lg transition"
            title="Atualizar Preço"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      
      {error && !loading && (
        <p className="text-orange-400 text-xs mt-2 flex items-center gap-1">
          <AlertTriangle size={10} />
          {error}
        </p>
      )}
    </div>
  );
}