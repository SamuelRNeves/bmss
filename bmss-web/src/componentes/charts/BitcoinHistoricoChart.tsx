"use client";

import { useState, useEffect } from "react";
import { getBitcoinHistorico } from "@/lib/api";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";
import { Calendar, TrendingUp, BarChart3, RefreshCw } from "lucide-react";

interface BitcoinHistoricoChartProps {
  className?: string;
}

export default function BitcoinHistoricoChart({ className = "" }: BitcoinHistoricoChartProps) {
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<number>(30); // 30 dias padrão
  const [tipoGrafico, setTipoGrafico] = useState<"linha" | "area" | "barra">("area");

  const carregarDados = async (dias: number = periodo) => {
    try {
      setLoading(true);
      setError(null);
      
      const resultado = await getBitcoinHistorico(dias);
      
      if (resultado.data) {
        setDados(resultado.data);
      } else {
        setError(resultado.error || "Erro ao carregar dados históricos");
      }
    } catch (err) {
      setError("Erro de conexão com a API");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const formatarTooltip = (value: number, name: string) => {
    if (name === "price") {
      return [new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD'
      }).format(value), "Preço"];
    }
    if (name === "volume") {
      return [`${value}M`, "Volume"];
    }
    return [value, name];
  };

  if (loading) {
    return (
      <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <TrendingUp size={24} />
            Histórico do Bitcoin
          </h3>
          <div className="animate-spin">
            <RefreshCw size={20} className="text-yellow-400" />
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-400">Carregando dados históricos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <TrendingUp size={24} />
            Histórico do Bitcoin
          </h3>
        </div>
        <div className="h-80 flex items-center justify-center flex-col gap-3">
          <p className="text-red-400 text-center">{error}</p>
          <button
            onClick={() => carregarDados()}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 ${className}`}>
      {/* Header do Gráfico */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <TrendingUp size={24} />
            Histórico do Bitcoin
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Últimos {dados?.periodo} • {dados?.isFallback ? "Dados de exemplo" : "Dados em tempo real"}
          </p>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-3">
          {/* Seletor de Período */}
          <div className="flex items-center gap-2 bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => { setPeriodo(7); carregarDados(7); }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                periodo === 7 
                  ? "bg-yellow-500 text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              7D
            </button>
            <button
              onClick={() => { setPeriodo(30); carregarDados(30); }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                periodo === 30 
                  ? "bg-yellow-500 text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              30D
            </button>
            <button
              onClick={() => { setPeriodo(365); carregarDados(365); }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                periodo === 365 
                  ? "bg-yellow-500 text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              1A
            </button>
          </div>

          {/* Seletor de Tipo de Gráfico */}
          <div className="flex items-center gap-2 bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setTipoGrafico("linha")}
              className={`p-1 rounded transition ${
                tipoGrafico === "linha" 
                  ? "bg-yellow-500 text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
              title="Gráfico de Linha"
            >
              <TrendingUp size={16} />
            </button>
            <button
              onClick={() => setTipoGrafico("area")}
              className={`p-1 rounded transition ${
                tipoGrafico === "area" 
                  ? "bg-yellow-500 text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
              title="Gráfico de Área"
            >
              <BarChart3 size={16} />
            </button>
            <button
              onClick={() => setTipoGrafico("barra")}
              className={`p-1 rounded transition ${
                tipoGrafico === "barra" 
                  ? "bg-yellow-500 text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
              title="Gráfico de Barras"
            >
              <BarChart3 size={16} />
            </button>
          </div>

          {/* Botão Atualizar */}
          <button
            onClick={() => carregarDados()}
            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition"
            title="Atualizar Dados"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {tipoGrafico === "linha" && (
            <LineChart data={dados.prices}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => {
                  if (periodo <= 30) return value.split('/')[0]; // Dia apenas
                  return value;
                }}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip 
                formatter={formatarTooltip}
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#F59E0B" }}
              />
            </LineChart>
          )}

          {tipoGrafico === "area" && (
            <AreaChart data={dados.prices}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip formatter={formatarTooltip} />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#F59E0B" 
                strokeWidth={2}
                fill="url(#colorPrice)"
                fillOpacity={0.3}
              />
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
            </AreaChart>
          )}

          {tipoGrafico === "barra" && (
            <BarChart data={dados.prices}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip formatter={formatarTooltip} />
              <Bar 
                dataKey="price" 
                fill="#F59E0B" 
                fillOpacity={0.8}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Estatísticas Rápidas */}
      {dados.prices && dados.prices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-800">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Preço Atual</p>
            <p className="text-white font-bold text-lg">
              {dados.prices[dados.prices.length - 1].priceFormatted}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Variação {periodo}D</p>
            <p className={`font-bold text-lg ${
              dados.prices[dados.prices.length - 1].price > dados.prices[0].price 
                ? "text-green-400" 
                : "text-red-400"
            }`}>
              {((dados.prices[dados.prices.length - 1].price - dados.prices[0].price) / dados.prices[0].price * 100).toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Mínimo</p>
            <p className="text-white font-bold text-lg">
              ${Math.min(...dados.prices.map((p: any) => p.price)).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Máximo</p>
            <p className="text-white font-bold text-lg">
              ${Math.max(...dados.prices.map((p: any) => p.price)).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}