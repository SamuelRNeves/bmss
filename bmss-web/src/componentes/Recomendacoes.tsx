"use client";

import React, { JSX, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Smile,
  Frown,
  Flame,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { getFeed } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

type InvestorProfile = "CONSERVADOR" | "MODERADO" | "AGRESSIVO";
type SentimentLabel = "positivo" | "negativo" | "neutro";
type SentimentStrength = "forte" | "moderada" | "leve";

interface Recomendacao {
  titulo: string;
  mensagem: string;
  icone: JSX.Element;
  cor: string;
}

interface SentimentSnapshot {
  nivel: SentimentLabel;
  intensidade: SentimentStrength;
  media: number;
}

const SENTIMENT_THRESHOLDS = {
  positivo: 0.06,
  negativo: -0.06,
  intensidadeForte: 0.16,
  intensidadeModerada: 0.09,
};

const formatScore = (score: number): string =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(score);

const normalizeProfile = (value: unknown): InvestorProfile | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "CONSERVADOR" || normalized === "MODERADO" || normalized === "AGRESSIVO") {
    return normalized;
  }
  return null;
};

const buildRecommendation = (
  perfil: InvestorProfile,
  snapshot: SentimentSnapshot
): Recomendacao => {
  const { nivel, intensidade, media } = snapshot;
  const sentimentoFormatado = nivel === "positivo" ? "positivo" : nivel === "negativo" ? "negativo" : "neutro";
  const intensidadeLegivel =
    intensidade === "forte" ? "forte" : intensidade === "moderada" ? "moderada" : "leve";
  const scoreFormatado = formatScore(media);

  if (nivel === "positivo") {
    if (perfil === "AGRESSIVO") {
      return {
        titulo:
          intensidade === "forte"
            ? "Rali explosivo no radar"
            : "Pressão compradora consistente",
        mensagem: `Sentimento médio em ${scoreFormatado}. ${
          intensidade === "forte"
            ? "Fluxo comprador intenso: considere aumentar posição com stops apertados e realizar parciais."
            : "Alta saudável — reforce entradas em rompimentos e monitore volume para não perder o ritmo."
        }`,
        icone: <Flame className="text-emerald-400" size={24} />,
        cor: "border-emerald-500",
      };
    }

    if (perfil === "MODERADO") {
      return {
        titulo:
          intensidade === "forte"
            ? "Alta forte pede disciplina"
            : "Tendência positiva bem sustentada",
        mensagem: `Sentimento ${sentimentoFormatado} (${scoreFormatado}). ${
          intensidade === "forte"
            ? "Faça entradas graduais, proteja lucros com ordens de proteção e evite alavancagem alta."
            : "Diversifique entradas, rebalanceie posições vencedoras e mantenha caixa para correções."
        }`,
        icone: <TrendingUp className="text-lime-400" size={24} />,
        cor: "border-lime-500",
      };
    }

    return {
      titulo: "Otimismo controlado",
      mensagem: `Clima ${sentimentoFormatado} (${scoreFormatado}) com intensidade ${intensidadeLegivel}. Aproveite ganhos, mas priorize ativos de renda fixa ou proteções com lastro real e use alocações menores em cripto.`,
      icone: <ShieldCheck className="text-yellow-300" size={24} />,
      cor: "border-yellow-400",
    };
  }

  if (nivel === "negativo") {
    if (perfil === "AGRESSIVO") {
      return {
        titulo:
          intensidade === "forte"
            ? "Sangue nas ruas: oportunidade tática"
            : "Mercado pressionado, olho nos descontos",
        mensagem: `Sentimento médio em ${scoreFormatado}. ${
          intensidade === "forte"
            ? "Procure entradas escalonadas em zonas de suporte e considere operar reversões rápidas."
            : "Monte posições táticas em ativos fortes e aproveite para acumular com stops definidos."
        }`,
        icone: <AlertTriangle className="text-red-400" size={24} />,
        cor: "border-red-500",
      };
    }

    if (perfil === "MODERADO") {
      return {
        titulo:
          intensidade === "forte"
            ? "Risco elevado: preserve capital"
            : "Cautela reforçada",
        mensagem: `Humor ${sentimentoFormatado} (${scoreFormatado}). ${
          intensidade === "forte"
            ? "Reduza exposição, mantenha hedge em stablecoins e espere confirmação de reversão."
            : "Evite operações grandes, revise stops e use aportes apenas em momentos de confirmação."
        }`,
        icone: <ShieldAlert className="text-orange-400" size={24} />,
        cor: "border-orange-500",
      };
    }

    return {
      titulo: "Proteção máxima ativada",
      mensagem: `Ambiente ${sentimentoFormatado} (${scoreFormatado}) com intensidade ${intensidadeLegivel}. Fique líquido, priorize ativos defensivos e avalie apenas operações curtíssimas com tamanho reduzido.`,
      icone: <Frown className="text-red-400" size={24} />,
      cor: "border-red-600",
    };
  }

  // cenário neutro
  if (perfil === "AGRESSIVO") {
    return {
      titulo: "Mercado lateral: prepara o próximo trade",
      mensagem: `Sentimento neutro (${scoreFormatado}). Use o período para estudar rompimentos, montar listas de compra e aguardar gatilhos claros antes de se expor.`,
      icone: <Brain className="text-blue-400" size={24} />,
      cor: "border-blue-500",
    };
  }

  if (perfil === "MODERADO") {
    return {
      titulo: "Paciência estratégica",
      mensagem: `Sentimento neutro (${scoreFormatado}). Mantenha rebalanceamento em dia e prepare aportes graduais caso a tendência defina direção.`,
      icone: <Brain className="text-sky-400" size={24} />,
      cor: "border-sky-500",
    };
  }

  return {
    titulo: "Mercado estável, foco em segurança",
    mensagem: `Clima neutro (${scoreFormatado}). Mantenha reservas em renda fixa, reforce proteções e só incremente risco com sinais muito claros.`,
    icone: <Smile className="text-gray-300" size={24} />,
    cor: "border-gray-500",
  };
};

export default function Recomendacoes() {
  const { user, loading: isLoadingUser } = useAuth();
  const [perfil, setPerfil] = useState<InvestorProfile | null>(null);
  const [snapshot, setSnapshot] = useState<SentimentSnapshot>({
    nivel: "neutro",
    intensidade: "leve",
    media: 0,
  });

  // 🔹 Atualiza perfil quando usuário autentica
  useEffect(() => {
    const resolved = normalizeProfile(user?.investorProfile);
    if (resolved) {
      setPerfil(resolved);
    }
  }, [user?.investorProfile]);

  useEffect(() => {
    if (!isLoadingUser && perfil === null) {
      setPerfil("MODERADO");
    }
  }, [isLoadingUser, perfil]);

  // 🔹 Calcula o sentimento médio (média dos scores das notícias)
  const calcularSentimento = async () => {
    try {
      const { data } = await getFeed("news", 120, "bitcoin", false);
      if (!Array.isArray(data) || data.length === 0) return;

      const scores = data
        .map((item: unknown) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const value = (item as { score?: unknown }).score;
          return typeof value === "number" && Number.isFinite(value) ? value : null;
        })
        .filter((value): value is number => value !== null);

      if (scores.length === 0) return;

      const media = scores.reduce((acc, curr) => acc + curr, 0) / scores.length;
      const nivel: SentimentLabel =
        media > SENTIMENT_THRESHOLDS.positivo
          ? "positivo"
          : media < SENTIMENT_THRESHOLDS.negativo
          ? "negativo"
          : "neutro";

      const intensidade: SentimentStrength =
        Math.abs(media) >= SENTIMENT_THRESHOLDS.intensidadeForte
          ? "forte"
          : Math.abs(media) >= SENTIMENT_THRESHOLDS.intensidadeModerada
          ? "moderada"
          : "leve";

      setSnapshot({
        nivel,
        intensidade,
        media,
      });
    } catch (error) {
      console.warn("⚠️ Erro ao calcular sentimento — usando valor anterior.", error);
    }
  };

  // 🔁 Atualiza automaticamente a cada 60 segundos
  useEffect(() => {
    calcularSentimento();
    const interval = setInterval(calcularSentimento, 60000);
    return () => clearInterval(interval);
  }, []);

  const recomendacao = useMemo(() => {
    if (!perfil) return null;
    return buildRecommendation(perfil, snapshot);
  }, [perfil, snapshot]);

  if (!recomendacao) {
    return (
      <div className="text-gray-400 text-center">
        Carregando recomendações personalizadas...
      </div>
    );
  }

  // ✨ Animação de transição suave
  const perfilAtual = perfil ?? "MODERADO";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${perfilAtual}-${snapshot.nivel}-${snapshot.intensidade}`}
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
          <p className="mt-2 text-xs text-gray-500">
            Score médio das notícias: {formatScore(snapshot.media)}
          </p>
          <p className="mt-3 text-xs text-gray-500">
            <strong>Perfil:</strong> {perfilAtual} | <strong>Sentimento:</strong> {snapshot.nivel} ({
              snapshot.intensidade
            })
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
