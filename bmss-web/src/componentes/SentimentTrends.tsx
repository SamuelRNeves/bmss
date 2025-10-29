// components/SentimentTrends.tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from "recharts";
import { useEffect, useState } from "react";
import { getTendencias } from "../lib/api";
import { motion } from "framer-motion";

type SentimentTrend = {
  day: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  isFallback?: boolean;
};




// components/SentimentTrends.tsx - CORREÇÃO DO TOOLTIP

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-900 border border-neutral-700 p-3 rounded-lg shadow-lg">
        <p className="text-gray-300 font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          // 🔹 CORREÇÃO: Usar raw values (porcentagem) em vez de converter
          const rawValue = entry.payload.rawPositive || entry.payload.rawNeutral || entry.payload.rawNegative;
          const percentageValue = rawValue !== undefined ? 
            rawValue.toFixed(1) : 
            (entry.value * 100).toFixed(1);
            
          return (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {percentageValue}%
            </p>
          );
        })}
        {payload[0]?.payload?.total && (
          <p className="text-xs text-gray-400 mt-2">
            Total: {payload[0].payload.total} itens
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function SentimentTrends() {
  const [data, setData] = useState<SentimentTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data, isFallback } = await getTendencias();
        if (data) {
          setData(data);
          setIsFallback(isFallback);
        }
      } catch (error) {
        console.error("Erro ao carregar tendências:", error);
        setIsFallback(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const intervalo = setInterval(fetchData, 120000); // Atualizar a cada 2 minutos
    return () => clearInterval(intervalo);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-inner"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-100">
          Tendência de Sentimento (7 dias)
        </h2>
        {!loading && data.length > 0 && (
          <span className="text-xs text-gray-400">
            {data.length} períodos analisados
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">Carregando tendências...</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-sm text-center">
            📊 Nenhum dado disponível para exibir tendências.
            <br />
            <span className="text-xs">
              Execute algumas análises primeiro.
            </span>
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis 
              dataKey="day" 
              stroke="#aaa"
              fontSize={12}
            />
            <YAxis 
              stroke="#aaa"
              fontSize={12}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                color: "#fff", 
                paddingTop: "10px",
                fontSize: "12px"
              }}
            />
            
            {/* Área para positivo */}
            <Area
              type="monotone"
              dataKey="positive"
              stackId="1"
              stroke="#22c55e"
              fill="url(#colorPositive)"
              fillOpacity={0.6}
              strokeWidth={2}
            />
            
            {/* Área para neutro */}
            <Area
              type="monotone"
              dataKey="neutral"
              stackId="1"
              stroke="#facc15"
              fill="url(#colorNeutral)"
              fillOpacity={0.6}
              strokeWidth={2}
            />
            
            {/* Área para negativo */}
            <Area
              type="monotone"
              dataKey="negative"
              stackId="1"
              stroke="#ef4444"
              fill="url(#colorNegative)"
              fillOpacity={0.6}
              strokeWidth={2}
            />
            
            {/* Linhas destacadas */}
            <Line
              type="monotone"
              dataKey="positive"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ r: 4, fill: "#22c55e" }}
              activeDot={{ r: 6, fill: "#22c55e" }}
            />
            <Line
              type="monotone"
              dataKey="neutral"
              stroke="#facc15"
              strokeWidth={3}
              dot={{ r: 4, fill: "#facc15" }}
              activeDot={{ r: 6, fill: "#facc15" }}
            />
            <Line
              type="monotone"
              dataKey="negative"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4, fill: "#ef4444" }}
              activeDot={{ r: 6, fill: "#ef4444" }}
            />
            
            {/* Gradientes para as áreas */}
            <defs>
              <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#facc15" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#facc15" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
          </ComposedChart>
        </ResponsiveContainer>
      )}

     


      
    </motion.section>
  );
}