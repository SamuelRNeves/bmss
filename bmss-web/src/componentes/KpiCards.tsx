"use client";

import { getSentimentos } from "../lib/api";
import { useCallback, useEffect, useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { motion, AnimatePresence } from "framer-motion";

type SentimentKpi = {
  label: string;
  value: number;
  color: string;
};

type SentimentResponse = {
  positive?: number | string;
  neutral?: number | string;
  negative?: number | string;
};

export default function KpiCards() {
  const [kpis, setKpis] = useState<SentimentKpi[]>([
    { label: "Positivo", value: 0, color: "#22c55e" },
    { label: "Neutro", value: 0, color: "#facc15" },
    { label: "Negativo", value: 0, color: "#ef4444" },
  ]);

  const aplicarSentimentos = useCallback((dados: unknown) => {
    if (!dados || typeof dados !== "object") {
      return;
    }

    const { positive, neutral, negative } = dados as SentimentResponse;

    const parse = (value?: number | string) => {
      if (typeof value === "number") {
        return value;
      }

      if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }

      return undefined;
    };

    const positivo = parse(positive);
    const neutro = parse(neutral);
    const negativo = parse(negative);

    if (
      positivo === undefined ||
      neutro === undefined ||
      negativo === undefined
    ) {
      return;
    }

    setKpis([
      { label: "Positivo", value: Math.round(positivo * 100), color: "#22c55e" },
      { label: "Neutro", value: Math.round(neutro * 100), color: "#facc15" },
      { label: "Negativo", value: Math.round(negativo * 100), color: "#ef4444" },
    ]);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const data = await getSentimentos();
      aplicarSentimentos(data);
    } catch (error) {
      console.error("Erro ao carregar sentimentos", error);
    }
  }, [aplicarSentimentos]);

  useEffect(() => {
    fetchData();
    const intervalo = setInterval(fetchData, 60000); // atualiza a cada 60s

    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<unknown>;
      aplicarSentimentos(customEvent.detail);
    };

    window.addEventListener("sentiments-updated", listener as EventListener);

    return () => {
      window.removeEventListener("sentiments-updated", listener as EventListener);
      clearInterval(intervalo);
    };
  }, [aplicarSentimentos, fetchData]);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {kpis.map((kpi) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-inner hover:shadow-lg transition-shadow"
          >
            <motion.div
              key={kpi.value} // anima quando o valor muda
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
    </section>
  );
}
