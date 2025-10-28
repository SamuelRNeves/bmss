"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getSentimentos, getFeed } from "../lib/api";

export default function Loader() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      try {
        // tenta ambos os endpoints antes de esconder o loader
        await Promise.all([getSentimentos(), getFeed()]);
        setLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        // ainda assim libera a tela para evitar travamento
        setLoaded(true);
      }
    }

    carregarDados();
  }, []);

  if (loaded) return null; // só mostra o loader enquanto estiver carregando

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        {/* Logo central */}
        <Image
          src="/bmss-logo.png"
          alt="BMSS Logo"
          width={220}
          height={220}
          priority
          className="drop-shadow-[0_0_20px_#facc15]"
        />

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-4 text-yellow-400 font-bold text-2xl tracking-widest"
        >
          BMSS
        </motion.h1>

        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
          className="text-gray-400 text-sm mt-3"
        >
          Carregando dados do mercado...
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
