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

type SentimentTrend = {
  day: string;
  positive: number;
  neutral: number;
  negative: number;
};

export default function SentimentTrends() {
  const [data, setData] = useState<SentimentTrend[]>([]);

  useEffect(() => {
    getTendencias()
      .then((data) => setData(data))
      .catch(() => console.error("Erro ao carregar tendências"));
  }, []);

  // Mock de dados (futuramente virá da API /tendencias)
  useEffect(() => {
    setTimeout(() => {
      setData([
        { day: "Dia 1", positive: 45, neutral: 30, negative: 25 },
        { day: "Dia 2", positive: 48, neutral: 29, negative: 23 },
        { day: "Dia 3", positive: 50, neutral: 28, negative: 22 },
        { day: "Dia 4", positive: 52, neutral: 30, negative: 18 },
        { day: "Dia 5", positive: 40, neutral: 27, negative: 33 },
      ]);
    }, 800);
  }, []);

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-inner">
      <h2 className="text-lg font-semibold text-gray-100 mb-4">
        Tendência de Sentimento (5 dias)
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          Carregando gráfico...
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
            <Legend
              wrapperStyle={{
                color: "#fff",
                paddingTop: "10px",
              }}
            />
            <Line
              type="monotone"
              dataKey="positive"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Positivo"
            />
            <Line
              type="monotone"
              dataKey="neutral"
              stroke="#facc15"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Neutro"
            />
            <Line
              type="monotone"
              dataKey="negative"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Negativo"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
