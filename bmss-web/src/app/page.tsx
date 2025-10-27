"use client";

import { motion } from "framer-motion";
import Header from "@/componentes/Header";
import KpiCards from "@/componentes/KpiCards";
import NewsList from "@/componentes/NewsList";
import SentimentTrends from "@/componentes/SentimentTrends";
import Loader from "@/componentes/Loader";
import TweetsList from "@/componentes/TweetsList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <KpiCards />
        </motion.div>

        {/* Tendências e Abas (Notícias / Tweets) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="grid gap-8 lg:grid-cols-3"
        >
          {/* Tendência de Sentimentos */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <SentimentTrends />
          </div>

          {/* Abas de conteúdo lateral */}
          <div className="flex flex-col gap-8">
            <Tabs defaultValue="news" className="w-full">
              <TabsList className="flex justify-around bg-neutral-900 rounded-lg p-2 border border-neutral-700">
                <TabsTrigger
                  value="news"
                  className="text-gray-300 data-[state=active]:text-blue-400"
                >
                  📰 Notícias
                </TabsTrigger>
                <TabsTrigger
                  value="tweets"
                  className="text-gray-300 data-[state=active]:text-sky-400"
                >
                  🐦 Tweets
                </TabsTrigger>
              </TabsList>

              {/* Conteúdo das Abas */}
              <TabsContent value="news">
                <NewsList />
              </TabsContent>

              <TabsContent value="tweets">
                <TweetsList />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
