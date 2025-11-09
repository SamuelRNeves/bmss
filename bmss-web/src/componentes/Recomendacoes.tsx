"use client";

import React, { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, TrendingUp, AlertTriangle, Smile, Frown } from "lucide-react";
import { getFeed } from "@/lib/api";

interface Recomendacao {
  titulo: string;
  mensagem: string;
  icone: JSX.Element;
  cor: string;
}

export default function Recomendacoes() {
  const [perfil, setPerfil] = useState<"CONSERVADOR" | "MODERADO" | "AGRESSIVO">("MODERADO");
  const [sentimentoGeral, setSentimentoGeral] = useState<string>("neutro");
  const [recomendacao, setRecomendacao] = useState<Recomendacao | null>(null);

  // 🔹 Busca perfil do usuário autenticado
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "https://bmss-backend.onrender.com"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.investorProfile) setPerfil(data.investorProfile);
      })
      .catch(() => setPerfil("MODERADO"));
  }, []);

  // 🔹 Calcula o sentimento médio (média dos scores das notícias)
  async function calcularSentimento() {
    try {
      const { data } = await getFeed("news", 30, "bitcoin", false);
      if (!data || data.length === 0) return;

      const scores = data
        .filter((n: any) => typeof n.score === "number")
        .map((n: any) => n.score);

      if (scores.length === 0) return;

      const media = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      if (media > 0.05) setSentimentoGeral("positivo");
      else if (media < -0.05) setSentimentoGeral("negativo");
      else setSentimentoGeral("neutro");
    } catch {
      console.warn("⚠️ Erro ao calcular sentimento — usando valor anterior.");
    }
  }

  // 🔁 Atualiza automaticamente a cada 60 segundos
  useEffect(() => {
    calcularSentimento();
    const interval = setInterval(calcularSentimento, 60000);
    return () => clearInterval(interval);
  }, []);

  // 🔹 Gera recomendação personalizada
  useEffect(() => {
    let nova: Recomendacao;

    if (sentimentoGeral === "positivo") {
      if (perfil === "AGRESSIVO")
        nova = {
          titulo: "Otimismo no mercado!",
          mensagem:
            "O sentimento geral é positivo — boas oportunidades para aumentar exposição a ativos de risco como Bitcoin.",
          icone: <TrendingUp className="text-green-400" size={24} />,
          cor: "border-green-500",
        };
      else if (perfil === "MODERADO")
        nova = {
          titulo: "Tendência positiva moderada",
          mensagem:
            "O mercado mostra sinais de otimismo. Avalie entradas parciais e mantenha diversificação.",
          icone: <Smile className="text-yellow-400" size={24} />,
          cor: "border-yellow-500",
        };
      else
        nova = {
          titulo: "Atenção: mercado otimista, mas com cautela",
          mensagem:
            "Mesmo com o sentimento positivo, mantenha reservas e prefira ativos de menor risco.",
          icone: <AlertTriangle className="text-yellow-300" size={24} />,
          cor: "border-yellow-500",
        };
    } else if (sentimentoGeral === "negativo") {
      if (perfil === "AGRESSIVO")
        nova = {
          titulo: "Mercado em queda — possível oportunidade!",
          mensagem:
            "O sentimento é negativo, mas quedas podem representar pontos de entrada estratégicos.",
          icone: <Frown className="text-red-400" size={24} />,
          cor: "border-red-500",
        };
      else if (perfil === "MODERADO")
        nova = {
          titulo: "Cautela recomendada",
          mensagem:
            "Mercado em queda — evite movimentos grandes e mantenha acompanhamento diário.",
          icone: <AlertTriangle className="text-orange-400" size={24} />,
          cor: "border-orange-500",
        };
      else
        nova = {
          titulo: "Evite exposição ao risco",
          mensagem:
            "O mercado está pessimista. Prefira manter liquidez e aguardar reversão de tendência.",
          icone: <Frown className="text-red-400" size={24} />,
          cor: "border-red-600",
        };
    } else {
      nova = {
        titulo: "Mercado está neutro",
        mensagem:
          "O sentimento geral é estável. Boa hora para observar tendências e aguardar confirmações.",
        icone: <Brain className="text-blue-400" size={24} />,
        cor: "border-blue-500",
      };
    }

    setRecomendacao(nova);
  }, [perfil, sentimentoGeral]);

  if (!recomendacao)
    return <div className="text-gray-400 text-center">Carregando recomendações...</div>;

  // ✨ Animação de transição suave
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${perfil}-${sentimentoGeral}`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`border ${recomendacao.cor} bg-neutral-900 rounded-2xl p-6 flex items-start gap-4 transition-all`}
      >
        <div className="flex-shrink-0">{recomendacao.icone}</div>
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{recomendacao.titulo}</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{recomendacao.mensagem}</p>
          <p className="mt-3 text-xs text-gray-500">
            <strong>Perfil:</strong> {perfil} | <strong>Sentimento:</strong> {sentimentoGeral}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
