// components/KpiCards.tsx
"use client";

import { getSentimentos } from "../lib/api";
import { useEffect, useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { motion, AnimatePresence } from "framer-motion";

type SentimentKpi = {
  label: string;
  value: number;
  color: string;
  count?: number;
};

// 🔹 CORREÇÃO: Adicionar timestamp ao tipo SentimentData
type SentimentData = {
  positive: number;
  neutral: number;
  negative: number;
  totalAnalisados: number;
  timestamp?: string; // 🔹 Adicionado como opcional
  isFallback?: boolean;
  rawPositive?: number;  // Valor em porcentagem (0-100)
  rawNeutral?: number;   // Valor em porcentagem (0-100)
  rawNegative?: number;  // Valor em porcentagem (0-100)
};

export default function KpiCards() {
  const [kpis, setKpis] = useState<SentimentKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [totalAnalisados, setTotalAnalisados] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // components/KpiCards.tsx - CORREÇÃO DOS VALORES

const fetchData = async () => {
  setLoading(true);
  try {
    const { data, isFallback: apiIsFallback, error } = await getSentimentos();
    
    if (data) {
      const sentimentData = data as SentimentData;
      
      setIsFallback(sentimentData.isFallback ?? apiIsFallback);
      setTotalAnalisados(sentimentData.totalAnalisados || 0);
      setLastUpdate(sentimentData.timestamp || new Date().toISOString());

      // 🔹 CORREÇÃO: Usar raw values (porcentagem) ou converter decimal para porcentagem
      const positiveValue = sentimentData.rawPositive || (sentimentData.positive * 100);
      const neutralValue = sentimentData.rawNeutral || (sentimentData.neutral * 100);
      const negativeValue = sentimentData.rawNegative || (sentimentData.negative * 100);

      setKpis([
        { 
          label: "Positivo", 
          value: Math.round(positiveValue), // Já está em porcentagem
          color: "#22c55e",
          count: Math.round((sentimentData.totalAnalisados || 0) * (sentimentData.positive || 0))
        },
        { 
          label: "Neutro", 
          value: Math.round(neutralValue), // Já está em porcentagem
          color: "#facc15",
          count: Math.round((sentimentData.totalAnalisados || 0) * (sentimentData.neutral || 0))
        },
        { 
          label: "Negativo", 
          value: Math.round(negativeValue), // Já está em porcentagem
          color: "#ef4444",
          count: Math.round((sentimentData.totalAnalisados || 0) * (sentimentData.negative || 0))
        },
      ]);
    }
  } catch (error) {
    console.error("Erro ao carregar KPIs:", error);
    setIsFallback(true);
  } finally {
    setLoading(false);
  }
};

  // ... resto do código permanece igual
  useEffect(() => {
    fetchData();
    const intervalo = setInterval(fetchData, 60000);
    return () => clearInterval(intervalo);
  }, []);

  if (loading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {["Positivo", "Neutro", "Negativo"].map((label) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-xl p-6 animate-pulse"
          >
            <div className="w-28 h-28 bg-neutral-800 rounded-full mb-4" />
            <div className="h-4 bg-neutral-800 rounded w-20 mb-2" />
            <div className="h-3 bg-neutral-800 rounded w-16" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">
            Análise de Sentimentos
          </h2>
          <p className="text-sm text-gray-400">
            {totalAnalisados > 0 
              ? `${totalAnalisados} itens analisados` 
              : 'Nenhum item analisado ainda'
            }
          </p>
        </div>
        
        {lastUpdate && (
          <span className="text-xs text-gray-500">
            Atualizado: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        )}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {kpis.map((kpi, index) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-inner hover:border-neutral-700 transition-colors"
            >
              <motion.div
                key={kpi.value}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
                className="w-28 h-28 mb-4"
              >
                <CircularProgressbar
                  value={kpi.value}
                  text={`${kpi.value}%`}
                  styles={buildStyles({
                    textColor: "#fff",
                    pathColor: kpi.color,
                    trailColor: "#333",
                    textSize: "16px",
                    pathTransition: "stroke-dashoffset 0.8s ease 0s",
                  })}
                />
              </motion.div>

              <div className="text-center">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.4 }}
                  className="text-lg font-medium text-gray-100 block"
                >
                  {kpi.label}
                </motion.span>
                {kpi.count !== undefined && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                    className="text-sm text-gray-400 block"
                  >
                    {kpi.count} {kpi.count === 1 ? 'item' : 'itens'}
                  </motion.span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </section>

      


      
    </div>
  );
}