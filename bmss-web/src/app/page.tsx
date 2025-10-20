"use client";

import { motion } from "framer-motion";
import Header from "@/componentes/Header";
import KpiCards from "@/componentes/KpiCards";
import NewsList from "@/componentes/NewsList";
import SentimentTrends from "@/componentes/SentimentTrends";
import Loader from "@/componentes/Loader"; // 👈 Adicionado aqui

export default function HomePage() {
  return (
    <>
      {/* Loader inicial */}
      <Loader />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col gap-8"
      >
        <Header />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <KpiCards />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="grid gap-8 lg:grid-cols-3"
        >
          <div className="lg:col-span-2 flex flex-col gap-8">
            <SentimentTrends />
          </div>

          <div className="flex flex-col gap-8">
            <NewsList />
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
