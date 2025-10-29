"use client";

import { motion } from "framer-motion";
import Header from "@/componentes/Header";
import KpiCards from "@/componentes/KpiCards";
import NewsList from "@/componentes/NewsList";
import SentimentTrends from "@/componentes/SentimentTrends";
import Loader from "@/componentes/Loader";
import TweetsList from "@/componentes/TweetsList";
import BitcoinPrice from "@/componentes/BitcoinPrice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  return (
    <>
      <Loader />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col gap-10 max-w-7xl mx-auto px-4"
      >
        {/* Header */}
        <Header />

        {/* Bitcoin Price - Destaque no topo */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <BitcoinPrice />
        </motion.div>

        {/* KPIs Cards */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <KpiCards />
        </motion.div>

        {/* Seção de Tendência */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 shadow-lg"
        >
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            📈 Tendência de Sentimento
          </h2>
          <SentimentTrends />
        </motion.section>

        {/* Abas modernas: Notícias / Tweets */}
        <motion.section
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 shadow-lg"
        >
          <h2 className="text-lg font-semibold text-gray-100 mb-6 text-center">
            📰 Análises Recentes
          </h2>

          <Tabs defaultValue="noticias" className="w-full">
            <TabsList className="flex justify-center bg-neutral-800 rounded-xl p-1 mb-6">
              <TabsTrigger
                value="noticias"
                className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-gray-400 rounded-lg px-6 py-2 text-sm font-medium transition-all"
              >
                📰 Notícias
              </TabsTrigger>
              <TabsTrigger
                value="tweets"
                className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-gray-400 rounded-lg px-6 py-2 text-sm font-medium transition-all"
              >
                🐦 Tweets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="noticias" className="animate-fadeIn">
              <NewsList />
            </TabsContent>

            <TabsContent value="tweets" className="animate-fadeIn">
              <TweetsList />
            </TabsContent>
          </Tabs>
        </motion.section>
      </motion.div>
    </>
  );
}