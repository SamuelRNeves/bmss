"use client";

import React, { JSX, useCallback, useEffect, useMemo, useState } from "react";
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
import {
  createFallbackNews,
  mapApiItemToFeedItem,
  type Sentiment,
} from "./news/feed-utils";

type InvestorProfile = "CONSERVADOR" | "MODERADO" | "AGRESSIVO";
type SentimentLabel = "positivo" | "negativo" | "neutro";
type SentimentStrength = "forte" | "moderada" | "leve";

type SentimentDistribution = Record<SentimentLabel, number>;

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
  distribuicao: SentimentDistribution;
  dominante: SentimentLabel;
  proporcaoDominante: number;
}

const SENTIMENT_THRESHOLDS = {
  positivo: 0.06,
  negativo: -0.06,
  intensidadeForte: 0.16,
  intensidadeModerada: 0.09,
};

const createDefaultSnapshot = (): SentimentSnapshot => ({
  nivel: "neutro",
  intensidade: "leve",
  media: 0,
  distribuicao: { positivo: 0, negativo: 0, neutro: 0 },
  dominante: "neutro",
  proporcaoDominante: 0,
});

const formatScore = (score: number): string =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(score);

const formatPercent = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const clampRatio = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const normalizeProfile = (value: unknown): InvestorProfile | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "CONSERVADOR" || normalized === "MODERADO" || normalized === "AGRESSIVO") {
    return normalized;
  }
  return null;
};

const mapSentimentToLabel = (sentiment: Sentiment): SentimentLabel => {
  switch (sentiment) {
    case "positive":
      return "positivo";
    case "negative":
      return "negativo";
    default:
      return "neutro";
  }
};

const buildRecommendation = (
  perfil: InvestorProfile,
  snapshot: SentimentSnapshot
): Recomendacao => {
  const { nivel, intensidade, media, distribuicao, dominante, proporcaoDominante } = snapshot;
  const total = distribuicao.positivo + distribuicao.negativo + distribuicao.neutro;

  if (total === 0) {
    return {
      titulo: "Analisando sentimento...",
      mensagem:
        "Ainda não há notícias suficientes com análise de sentimento. Assim que tivermos uma base mínima, liberamos recomendações personalizadas.",
      icone: <Brain className="text-sky-400" size={24} />,
      cor: "border-sky-500",
    };
  }

  const percentualPositivo = clampRatio(distribuicao.positivo / total);
  const percentualNegativo = clampRatio(distribuicao.negativo / total);
  const percentualNeutro = clampRatio(distribuicao.neutro / total);
  const percentualDominante = clampRatio(proporcaoDominante);

  const positivoTexto = formatPercent(percentualPositivo);
  const negativoTexto = formatPercent(percentualNegativo);
  const neutroTexto = formatPercent(percentualNeutro);
  const dominanteTexto = formatPercent(percentualDominante);

  const intensidadeLegivel =
    intensidade === "forte" ? "forte" : intensidade === "moderada" ? "moderada" : "leve";
  const scoreFormatado = formatScore(media);

  const baseStats = `Distribuição atual: ${positivoTexto} positivas, ${neutroTexto} neutras e ${negativoTexto} negativas (${total} notícias).`;

  const dominanceTone = (() => {
    if (percentualDominante >= 0.65) {
      return "predominância forte";
    }
    if (percentualDominante >= 0.5) {
      return "vantagem consistente";
    }
    return "leve vantagem";
  })();

  if (percentualDominante < 0.45) {
    if (perfil === "AGRESSIVO") {
      return {
        titulo: "Mercado dividido, jogadas cirúrgicas",
        mensagem: `${baseStats} Score médio em ${scoreFormatado} (${nivel}). Trabalhe com setups rápidos, confirme fluxo antes de alavancar e preserve parte do capital para o momento em que o noticiário escolher um lado.`,
        icone: <Brain className="text-blue-400" size={24} />,
        cor: "border-blue-500",
      };
    }

    if (perfil === "MODERADO") {
      return {
        titulo: "Equilíbrio pede disciplina",
        mensagem: `${baseStats} Score médio em ${scoreFormatado} (${nivel}). Mantenha entradas graduais, rebalanceie posições vencedoras e espere confirmações mais claras antes de aumentar risco.`,
        icone: <ShieldCheck className="text-sky-400" size={24} />,
        cor: "border-sky-500",
      };
    }

    return {
      titulo: "Noticiário misto, foco em proteção",
      mensagem: `${baseStats} Sem direção dominante, mantenha-se em ativos de menor volatilidade, aumente proteções e só assuma risco adicional quando a leitura apontar tendência consistente.`,
      icone: <ShieldAlert className="text-gray-300" size={24} />,
      cor: "border-gray-500",
    };
  }

  if (dominante === "positivo") {
    if (perfil === "AGRESSIVO") {
      return {
        titulo: percentualDominante >= 0.65 ? "Compradores dominam o noticiário" : "Fluxo otimista em aceleração",
        mensagem: `Predominância de ${dominanteTexto} de notícias positivas contra ${negativoTexto} negativas. Score médio em ${scoreFormatado} (${nivel}) com intensidade ${intensidadeLegivel}. Explore rompimentos, mantenha stops ajustados e realize parciais para proteger ganhos rápidos.`,
        icone: <Flame className="text-emerald-400" size={24} />,
        cor: "border-emerald-500",
      };
    }

    if (perfil === "MODERADO") {
      return {
        titulo: percentualDominante >= 0.65 ? "Alta forte exige gestão" : "Tendência positiva consolidando",
        mensagem: `${baseStats} Score médio em ${scoreFormatado} (${nivel}). Faça aportes graduais, rebalanceie lucros e mantenha parte da carteira líquida para aproveitar correções sem exagerar na exposição.`,
        icone: <TrendingUp className="text-lime-400" size={24} />,
        cor: "border-lime-500",
      };
    }

    return {
      titulo: "Otimismo pede prudência",
      mensagem: `${baseStats} Score médio em ${scoreFormatado} (${nivel}) com intensidade ${intensidadeLegivel}. Aproveite o bom humor via produtos mais estáveis, use travas de proteção e evite concentrar posições em poucos ativos.`,
      icone: <ShieldCheck className="text-yellow-300" size={24} />,
      cor: "border-yellow-400",
    };
  }

  if (dominante === "negativo") {
    if (perfil === "AGRESSIVO") {
      return {
        titulo: percentualDominante >= 0.65 ? "Forte pressão vendedora" : "Clima pesado gera alvos táticos",
        mensagem: `Predominância de ${dominanteTexto} de notícias negativas e apenas ${positivoTexto} positivas. Score médio em ${scoreFormatado} (${nivel}) com intensidade ${intensidadeLegivel}. Busque entradas escalonadas em zonas de suporte e opere reversões rápidas com stops curtos.`,
        icone: <AlertTriangle className="text-red-400" size={24} />,
        cor: "border-red-500",
      };
    }

    if (perfil === "MODERADO") {
      return {
        titulo: percentualDominante >= 0.65 ? "Risco elevado: reduza exposição" : "Pressão baixista recomenda cautela",
        mensagem: `${baseStats} Score médio em ${scoreFormatado} (${nivel}). Proteja capital com hedge em stablecoins, reduza posições sensíveis e espere sinal de reversão antes de retomar compras.`,
        icone: <ShieldAlert className="text-orange-400" size={24} />,
        cor: "border-orange-500",
      };
    }

    return {
      titulo: "Defesa total ativada",
      mensagem: `${baseStats} Score médio em ${scoreFormatado} (${nivel}) com intensidade ${intensidadeLegivel}. Priorize liquidez, aumente posições em renda fixa e acompanhe o mercado apenas com lotes pequenos e muito bem protegidos.`,
      icone: <Frown className="text-red-400" size={24} />,
      cor: "border-red-600",
    };
  }

  // cenário neutro dominante
  if (perfil === "AGRESSIVO") {
    return {
      titulo: "Mercado lateral, prepare gatilhos",
      mensagem: `${baseStats} Score médio em ${scoreFormatado} (${nivel}) com intensidade ${intensidadeLegivel}. Use o período para mapear rompimentos potenciais e só entre com força quando o fluxo mostrar direção clara.`,
      icone: <Brain className="text-blue-400" size={24} />,
      cor: "border-blue-500",
    };
  }

  if (perfil === "MODERADO") {
    return {
      titulo: "Paciência estratégica em curso",
      mensagem: `${baseStats} Score médio em ${scoreFormatado} (${nivel}). Aproveite para rebalancear posições, reforçar stops e aguardar confirmações antes de elevar exposição.`,
      icone: <Brain className="text-sky-400" size={24} />,
      cor: "border-sky-500",
    };
  }

  return {
    titulo: "Clima neutro, mantenha proteções",
    mensagem: `${baseStats} Score médio em ${scoreFormatado} (${nivel}). Continue priorizando ativos defensivos e aumente gradualmente a exposição apenas se o noticiário ganhar viés consistente.`,
    icone: <Smile className="text-gray-300" size={24} />,
    cor: "border-gray-500",
  };
};

export default function Recomendacoes() {
  const { user, loading: isLoadingUser } = useAuth();
  const [perfil, setPerfil] = useState<InvestorProfile | null>(null);
  const [snapshot, setSnapshot] = useState<SentimentSnapshot>(() => createDefaultSnapshot());

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

  const calcularSentimento = useCallback(async () => {
    try {
      const { data } = await getFeed("news", 120, "bitcoin", false);
      if (!Array.isArray(data) || data.length === 0) {
        setSnapshot(createDefaultSnapshot());
        return;
      }

      const itensNormalizados = data.map((item: unknown) =>
        mapApiItemToFeedItem(item, createFallbackNews())
      );

      const scores = itensNormalizados
        .map((item) => {
          const value =
            typeof item.score === "number" ? item.score : Number(item.score);
          return Number.isFinite(value) ? value : null;
        })
        .filter((value): value is number => value !== null);

      const distribuicao: SentimentDistribution = { positivo: 0, negativo: 0, neutro: 0 };
      itensNormalizados.forEach((item) => {
        const label = mapSentimentToLabel(item.sentiment);
        distribuicao[label] += 1;
      });

      const total = distribuicao.positivo + distribuicao.negativo + distribuicao.neutro;

      if (scores.length === 0 && total === 0) {
        setSnapshot(createDefaultSnapshot());
        return;
      }

      const media =
        scores.length > 0
          ? scores.reduce((acc, curr) => acc + curr, 0) / scores.length
          : 0;

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

      const dominante: SentimentLabel = total
        ? (Object.entries(distribuicao)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .map(([key]) => key as SentimentLabel))[0]
        : "neutro";

      const proporcaoDominante = total ? distribuicao[dominante] / total : 0;

      setSnapshot({
        nivel,
        intensidade,
        media,
        distribuicao,
        dominante,
        proporcaoDominante,
      });
    } catch (error) {
      console.warn("⚠️ Erro ao calcular sentimento — usando valor anterior.", error);
    }
  }, []);

  useEffect(() => {
    calcularSentimento();
    const interval = setInterval(calcularSentimento, 60000);
    return () => clearInterval(interval);
  }, [calcularSentimento]);

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

  const perfilAtual = perfil ?? "MODERADO";
  const totalNoticias =
    snapshot.distribuicao.positivo +
    snapshot.distribuicao.negativo +
    snapshot.distribuicao.neutro;

  const percent = (value: number) =>
    totalNoticias === 0 ? 0 : Math.round((value / totalNoticias) * 100);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${perfilAtual}-${snapshot.nivel}-${snapshot.intensidade}-${snapshot.dominante}`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`border ${recomendacao.cor} bg-neutral-900 rounded-2xl p-6 flex flex-col gap-4 transition-all`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">{recomendacao.icone}</div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{recomendacao.titulo}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{recomendacao.mensagem}</p>
            <p className="mt-2 text-xs text-gray-500">
              Score médio das notícias: {formatScore(snapshot.media)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              <strong>Perfil:</strong> {perfilAtual} | <strong>Sentimento:</strong> {snapshot.nivel} ({
                snapshot.intensidade
              })
            </p>
          </div>
        </div>

        <div className="mt-2 space-y-3 text-xs text-gray-400">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-emerald-300">
                <TrendingUp size={14} /> Positivas
              </span>
              <span>
                {percent(snapshot.distribuicao.positivo)}% ({snapshot.distribuicao.positivo})
              </span>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${percent(snapshot.distribuicao.positivo)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sky-300">
                <Brain size={14} /> Neutras
              </span>
              <span>
                {percent(snapshot.distribuicao.neutro)}% ({snapshot.distribuicao.neutro})
              </span>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-sky-500"
                style={{ width: `${percent(snapshot.distribuicao.neutro)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-red-300">
                <AlertTriangle size={14} /> Negativas
              </span>
              <span>
                {percent(snapshot.distribuicao.negativo)}% ({snapshot.distribuicao.negativo})
              </span>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-red-500"
                style={{ width: `${percent(snapshot.distribuicao.negativo)}%` }}
              />
            </div>
          </div>
        </div>

        <p className="mt-1 text-[11px] text-gray-500">
          Baseado em {totalNoticias} notícias analisadas nos últimos minutos.
        </p>
      </motion.div>
    </AnimatePresence>
  );
}