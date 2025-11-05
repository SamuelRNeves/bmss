// components/charts/BitcoinHistoricoCompleto.tsx
"use client";

import { useState, useEffect } from "react";
import { getBitcoinHistoricoCompleto } from "@/lib/api";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Label
} from "recharts";
import { RefreshCw, Rocket, ChartLine, Trophy } from "lucide-react";

interface BitcoinHistoricoCompletoProps {
  className?: string;
}

interface PriceData {
  ano: number;
  price: number;
  priceFormatted: string;
  marco?: string;
}

interface HistoricoCompletoData {
  prices: PriceData[];
  totalDias: number;
  periodo: string;
  atualizado: string;
  precoAtual: number;
  precoInicial: number;
  crescimento: number;
  isFallback?: boolean;
}

export default function BitcoinHistoricoCompleto({ className = "" }: BitcoinHistoricoCompletoProps) {
  const [dados, setDados] = useState<HistoricoCompletoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const resultado = await getBitcoinHistoricoCompleto();
      
      if (resultado.data) {
        setDados(resultado.data);
      } else {
        setError(resultado.error || "Erro ao carregar dados históricos completos");
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

  // CORREÇÃO: Interface para o CustomTooltip
  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: PriceData;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 shadow-lg">
          <p className="font-bold text-yellow-400">{data.ano}</p>
          <p className="text-white">
            {data.priceFormatted}
          </p>
          {data.marco && (
            <p className="text-green-400 text-sm mt-1 flex items-center gap-1">
              <Rocket size={12} />
              {data.marco}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <ChartLine size={24} />
            História Completa do Bitcoin
          </h3>
          <div className="animate-spin">
            <RefreshCw size={20} className="text-yellow-400" />
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-400">Carregando história completa desde 2009...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <ChartLine size={24} />
            História Completa do Bitcoin
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

  // CORREÇÃO: Verificar se dados existe antes de renderizar
  if (!dados) {
    return null;
  }

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <ChartLine size={24} />
            História Completa do Bitcoin
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            {dados.periodo} • {dados.isFallback ? "Dados históricos simulados" : "Dados desde a criação"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => carregarDados()}
            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition flex items-center gap-2"
            title="Atualizar Dados"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados.prices} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="ano" 
              stroke="#9CA3AF"
              fontSize={12}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => {
                if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                return `$${value}`;
              }}
              scale="log"
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Linha do gráfico */}
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#F59E0B" 
              strokeWidth={3}
              dot={{ r: 4, fill: "#F59E0B", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#F59E0B", stroke: "#FFFFFF", strokeWidth: 2 }}
            />
            
            {/* CORREÇÃO: Tipagem nos pontos históricos */}
            {dados.prices.filter((p: PriceData) => p.marco).map((ponto: PriceData, index: number) => (
              <ReferenceLine 
                key={index}
                x={ponto.ano}
                stroke="#10B981"
                strokeDasharray="3 3"
                strokeWidth={1}
              >
                <Label 
                  value={ponto.ano} 
                  position="insideTopRight"
                  fill="#10B981"
                  fontSize={10}
                />
              </ReferenceLine>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Estatísticas Impressionantes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-800">
        <div className="text-center p-3 bg-neutral-800 rounded-lg">
          <p className="text-gray-400 text-sm">Crescimento Total</p>
          <p className="text-green-400 font-bold text-lg">
            {dados.crescimento > 0 ? '+' : ''}{dados.crescimento.toFixed(0)}%
          </p>
        </div>
        <div className="text-center p-3 bg-neutral-800 rounded-lg">
          <p className="text-gray-400 text-sm">
            Preço Inicial ({dados.prices[0]?.ano ?? "N/D"})
          </p>
          <p className="text-white font-bold text-lg">
            {dados.prices[0]
              ? new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: dados.precoInicial < 1 ? 6 : 2,
                  maximumFractionDigits: dados.precoInicial < 1 ? 6 : 2
                }).format(dados.precoInicial)
              : 'N/D'}
          </p>
        </div>
        <div className="text-center p-3 bg-neutral-800 rounded-lg">
          <p className="text-gray-400 text-sm">Preço Atual</p>
          <p className="text-yellow-400 font-bold text-lg">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'USD'
            }).format(dados.precoAtual)}
          </p>
        </div>
        <div className="text-center p-3 bg-neutral-800 rounded-lg">
          <p className="text-gray-400 text-sm">Período</p>
          <p className="text-white font-bold text-lg">{dados.periodo}</p>
        </div>
      </div>

      {/* Marcos Históricos */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-neutral-800 rounded-lg p-3">
          <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Rocket size={16} />
            Marcos Importantes
          </h4>
          <div className="text-sm text-gray-400 space-y-1">
            <p>• 2009: Bitcoin criado por Satoshi Nakamoto</p>
            <p>• 2010: Primeira transação real (2 pizzas)</p>
            <p>• 2013: Primeira bolha - US$ 1.000</p>
            <p>• 2017: Bull run histórico - US$ 20.000</p>
            <p>• 2021: ATH - US$ 69.000</p>
            <p>• 2024: ETF aprovado nos EUA</p>
          </div>
        </div>
        
        <div className="bg-neutral-800 rounded-lg p-3">
          <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Trophy size={16} />
            Curiosidades
          </h4>
          <div className="text-sm text-gray-400 space-y-1">
            <p>• Maior crescimento de ativo da história</p>
            <p>• De US$ 0,0008 para US$ 69.000</p>
            <p>• Crescimento de 8.600.000.000%</p>
            <p>• 2 pizzas em 2010 = US$ 400 milhões hoje</p>
            <p>• Mercado: US$ 1 trilhão+</p>
          </div>
        </div>
      </div>
    </div>
  );
}