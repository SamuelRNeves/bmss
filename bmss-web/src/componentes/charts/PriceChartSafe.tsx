"use client";

import { useState, useEffect, useMemo } from "react";
import { getBitcoin24h } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/useBreakpoint";

// Dados fallback garantidos
const FALLBACK_DATA = [
  { time: "00:00", price: 62000, priceFormatted: "US$ 62.000,00" },
  { time: "04:00", price: 62500, priceFormatted: "US$ 62.500,00" },
  { time: "08:00", price: 61800, priceFormatted: "US$ 61.800,00" },
  { time: "12:00", price: 63200, priceFormatted: "US$ 63.200,00" },
  { time: "16:00", price: 64000, priceFormatted: "US$ 64.000,00" },
  { time: "20:00", price: 64500, priceFormatted: "US$ 64.500,00" },
];

export default function PriceChartSafe() {
  // 🔥 CORREÇÃO: Garantir que todos os hooks sejam chamados na mesma ordem
  const [dados, setDados] = useState<any[]>(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variacao, setVariacao] = useState<number>(0);
  
  // 🔥 CORREÇÃO: useIsMobile deve sempre ser chamado, independente das condições
  const isMobile = useIsMobile();

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const resultado = await getBitcoin24h();
      
      if (resultado.data) {
        setDados(resultado.data.prices);
        setVariacao(Number(resultado.data.change24h));
      } else {
        setDados(FALLBACK_DATA);
        setVariacao(2.3);
        setError(resultado.error || "Usando dados simulados");
      }
    } catch (err) {
      console.error("Erro ao carregar dados do gráfico:", err);
      setDados(FALLBACK_DATA);
      setVariacao(2.3);
      setError("Erro de conexão - usando informações simuladas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    
    // Atualizar a cada 5 minutos
    const intervalo = setInterval(carregarDados, 300000);
    return () => clearInterval(intervalo);
  }, []);

  const isPositive = variacao > 0;
  const variacaoColor = isPositive ? "text-green-400" : "text-red-400";
  const VariacaoIcon = isPositive ? TrendingUp : TrendingDown;

  // 🔥 CORREÇÃO: Tooltip seguro
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-yellow-400 font-bold">
            {data.priceFormatted || `US$ ${(data.price || 0).toLocaleString('pt-BR')}`}
          </p>
        </div>
      );
    }
    return null;
  };

  // 🔥 CORREÇÃO: useMemo deve vir DEPOIS de todos os hooks básicos
  const chartMargins = useMemo(() => (
    isMobile
      ? { top: 10, right: 8, left: -10, bottom: 0 }
      : { top: 12, right: 16, left: 0, bottom: 0 }
  ), [isMobile]);

  // 🔥 CORREÇÃO: Condicionais APENAS no final, depois de todos os hooks
  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <TrendingUp size={24} />
              Preço do Bitcoin (24h)
            </h3>
            <p className="text-gray-400 text-sm mt-1">Carregando dados...</p>
          </div>
          <div className="animate-spin">
            <RefreshCw size={20} className="text-yellow-400" />
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-400">Carregando gráfico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-3">
            <TrendingUp size={22} className="hidden sm:inline" />
            <TrendingUp size={20} className="sm:hidden" />
            <span>Preço do Bitcoin (24h)</span>
          </h3>
          <div className={`flex items-center gap-1 ${variacaoColor}`}>
            <VariacaoIcon size={14} className="sm:hidden" />
            <VariacaoIcon size={16} className="hidden sm:block" />
            <span className="text-sm font-medium">
              {variacao > 0 ? '+' : ''}{variacao}%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {error && (
            <span className="bg-orange-500 text-white text-[11px] sm:text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} />
              SIMULAÇÃO
            </span>
          )}
          <button
            onClick={carregarDados}
            className="bg-yellow-500 hover:bg-yellow-400 text-black p-2 rounded-lg transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={chartMargins}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              fontSize={isMobile ? 10 : 12}
              interval={isMobile ? 1 : "preserveStartEnd"}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={isMobile ? 10 : 12}
              tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
              width={isMobile ? 38 : 46}
              domain={['dataMin - 1000', 'dataMax + 1000']}
            />
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#F59E0B"
              strokeWidth={isMobile ? 2 : 2.5}
              dot={false}
              activeDot={{ r: isMobile ? 3.5 : 4.5, fill: "#F59E0B" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {error && (
        <p className="text-orange-400 text-[11px] sm:text-xs mt-2 flex items-center gap-1">
          <AlertTriangle size={10} />
          {error}
        </p>
      )}
    </div>
  );
}