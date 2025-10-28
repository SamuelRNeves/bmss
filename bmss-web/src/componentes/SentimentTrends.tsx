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
} from "recharts";
import { useEffect, useState } from "react";
import { getTendencias } from "../lib/api";
import { motion } from "framer-motion";

type SentimentTrend = {
  day: string;
  positive: number;
  neutral: number;
  negative: number;
};

export default function SentimentTrends() {
  const [data, setData] = useState<SentimentTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, isFallback } = await getTendencias();
      if (data) setData(data);
      setIsFallback(isFallback);
      setLoading(false);
    }
    fetchData();
    const intervalo = setInterval(fetchData, 60000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-inner"
    >
      <h2 className="text-lg font-semibold text-gray-100 mb-4">
        Tendência de Sentimento 
      </h2>

      {loading ? (
        <p className="text-gray-500 text-sm text-center py-8">
          Carregando gráfico...
        </p>
      ) : data.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          Nenhum dado disponível.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="day" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend wrapperStyle={{ color: "#fff", paddingTop: "10px" }} />
            <Line type="monotone" dataKey="positive" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="neutral" stroke="#facc15" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {isFallback && (
        <p className="text-yellow-400 text-xs text-center mt-3">
          ⚠️ Exibindo gráfico com dados em cache
        </p>
      )}
    </motion.section>
  );
}
