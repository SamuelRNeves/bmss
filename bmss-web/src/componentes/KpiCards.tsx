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
};

export default function KpiCards() {
  const [kpis, setKpis] = useState<SentimentKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data, isFallback } = await getSentimentos();
    setIsFallback(isFallback);
    if (data) {
      setKpis([
        { label: "Positivo", value: Math.round(data.positive * 100), color: "#22c55e" },
        { label: "Neutro", value: Math.round(data.neutral * 100), color: "#facc15" },
        { label: "Negativo", value: Math.round(data.negative * 100), color: "#ef4444" },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const intervalo = setInterval(fetchData, 60000);
    return () => clearInterval(intervalo);
  }, []);

  if (loading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {["Positivo", "Neutro", "Negativo"].map((label) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-xl p-6 animate-pulse"
          >
            <div className="w-28 h-28 bg-neutral-800 rounded-full mb-4" />
            <span className="text-gray-500">{label}</span>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-inner"
          >
            <motion.div
              key={kpi.value}
              initial={{ scale: 0.9, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="w-28 h-28 mb-4"
            >
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
            </motion.div>

            <motion.span
              key={`${kpi.label}-${kpi.value}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-medium text-gray-100"
            >
              {kpi.label}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>

      {isFallback && (
        <p className="col-span-3 text-center text-yellow-400 mt-2">
          ⚠️ Exibindo dados em modo offline (cache/fallback)
        </p>
      )}
    </section>
  );
}
