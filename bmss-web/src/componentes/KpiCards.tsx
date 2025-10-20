"use client";

import { getSentimentos } from "../lib/api";
import { useEffect, useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

type SentimentKpi = {
  label: string;
  value: number;
  color: string;
};

export default function KpiCards() {
  const [kpis, setKpis] = useState<SentimentKpi[]>([
    { label: "Positivo", value: 0, color: "#22c55e" }, // verde
    { label: "Neutro", value: 0, color: "#facc15" },   // amarelo
    { label: "Negativo", value: 0, color: "#ef4444" }, // vermelho
  ]);

  // Simulação inicial (mock)
  useEffect(() => {
    // Em produção, futuramente trará os dados do endpoint /sentimento
    setTimeout(() => {
      setKpis([
        { label: "Positivo", value: 47, color: "#22c55e" },
        { label: "Neutro", value: 33, color: "#facc15" },
        { label: "Negativo", value: 20, color: "#ef4444" },
      ]);
    }, 800);
  }, []);

  useEffect(() => {
    getSentimentos()
      .then((data) => {
        setKpis([
          { label: "Positivo", value: Math.round(data.positive * 100), color: "#22c55e" },
          { label: "Neutro", value: Math.round(data.neutral * 100), color: "#facc15" },
          { label: "Negativo", value: Math.round(data.negative * 100), color: "#ef4444" },
        ]);
      })
      .catch(() => {
        console.error("Erro ao carregar sentimentos");
      });
  }, []);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {kpis.map((kpi, index) => (
        <div
          key={index}
          className="flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-inner hover:shadow-lg transition-shadow"
        >
          <div className="w-28 h-28 mb-4">
            <CircularProgressbar
              value={kpi.value}
              text={`${kpi.value}%`}
              styles={buildStyles({
                textColor: "#fff",
                pathColor: kpi.color,
                trailColor: "#333",
                textSize: "18px",
              })}
            />
          </div>
          <span className="text-lg font-medium text-gray-100">{kpi.label}</span>
        </div>
      ))}
    </section>
  );
}
