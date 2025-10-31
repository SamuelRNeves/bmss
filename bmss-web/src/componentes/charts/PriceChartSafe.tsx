"use client";

import { useState, useEffect } from "react";
import { getBitcoin24h } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";

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
  const [dados, setDados] = useState<any[]>(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variacao, setVariacao] = useState<number>(0);

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
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <TrendingUp size={24} />
            Preço do Bitcoin (24h)
          </h3>
          <div className={`flex items-center gap-1 mt-1 ${variacaoColor}`}>
            <VariacaoIcon size={16} />
            <span className="text-sm font-medium">
              {variacao > 0 ? '+' : ''}{variacao}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {error && (
            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
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

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `$${value / 1000}k`}
              domain={['dataMin - 1000', 'dataMax + 1000']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#F59E0B" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#F59E0B" }}
            />
          </LineChart>
        </ResponsiveContainer>
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