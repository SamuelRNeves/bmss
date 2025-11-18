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
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import type { SentimentSnapshot, InvestorProfile } from "@/lib/sentiment-insights";
import {
  clampRatio,
  createDefaultSnapshot,
} from "@/lib/sentiment-insights";

interface RecomendacoesProps {
  snapshot?: SentimentSnapshot;
  isLoading?: boolean;
}

interface Recomendacao {
  titulo: string;
  mensagem: string;
  icone: JSX.Element;
  cor: string;
}

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

  const baseStats = `Distribuição atual: ${positivoTexto} positivas, ${neutroTexto} neutras e ${negativoTexto} negativas.`;

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

export default function Recomendacoes({
  snapshot,
  isLoading = false,
}: RecomendacoesProps) {
  const { user, loading: isLoadingUser } = useAuth();
  const [perfil, setPerfil] = useState<InvestorProfile | null>(null);

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

  const snapshotAtual = snapshot ?? createDefaultSnapshot();

  const recomendacao = useMemo(() => {
    if (!perfil) return null;
    return buildRecommendation(perfil, snapshotAtual);
  }, [perfil, snapshotAtual]);

  if (!recomendacao) {
    return (
      <div className="text-gray-400 text-center">
        Carregando recomendações personalizadas...
      </div>
    );
  }

  const perfilAtual = perfil ?? "MODERADO";
  const percentuais = {
    positivo: Math.round(snapshotAtual.distribuicao.positivo),
    neutro: Math.round(snapshotAtual.distribuicao.neutro),
    negativo: Math.round(snapshotAtual.distribuicao.negativo),
  };

  const formatSignals = (percentual: number) => {
    if (!snapshotAtual.totalItens) return null;
    const estimado = Math.round((snapshotAtual.totalItens * percentual) / 100);
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
      estimado
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${perfilAtual}-${snapshotAtual.nivel}-${snapshotAtual.intensidade}-${snapshotAtual.dominante}`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`border ${recomendacao.cor} bg-neutral-900/80 backdrop-blur rounded-2xl p-6 flex flex-col gap-4 transition-all`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">{recomendacao.icone}</div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
              <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-gray-200">
                Perfil {perfilAtual}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-800/70 text-gray-300">
                {snapshotAtual.nivel} • {snapshotAtual.intensidade}
              </span>
              {isLoading && (
                <span className="flex items-center gap-1 text-amber-300">
                  <RefreshCw size={12} className="animate-spin" /> Atualizando
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white">{recomendacao.titulo}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {recomendacao.mensagem}
            </p>
            <p className="text-xs text-gray-500">
              Score médio dos sinais: {formatScore(snapshotAtual.media)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-400">
          <div className="rounded-xl bg-neutral-950/40 border border-neutral-800/70 p-3">
            <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-1">
              Liderança
            </p>
            <p className="text-sm text-white font-semibold capitalize">
              {snapshotAtual.dominante}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              {formatPercent(snapshotAtual.proporcaoDominante)} do noticiário
            </p>
          </div>
          <div className="rounded-xl bg-neutral-950/40 border border-neutral-800/70 p-3">
            <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-1">
              Intensidade
            </p>
            <p className="text-sm text-white font-semibold capitalize">
              {snapshotAtual.intensidade}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">Pulso alinhado aos gráficos</p>
          </div>
          <div className="rounded-xl bg-neutral-950/40 border border-neutral-800/70 p-3">
            <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-1">
              Total monitorado
            </p>
            <p className="text-sm text-white font-semibold">
              {snapshotAtual.totalItens > 0
                ? new Intl.NumberFormat("pt-BR").format(snapshotAtual.totalItens)
                : "Sincronizando"}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Mesmas fontes dos gráficos
            </p>
          </div>
        </div>

        <div className="mt-2 space-y-4 text-xs text-gray-400">
          {["positivo", "neutro", "negativo"].map((chave) => {
            const value = percentuais[chave as keyof typeof percentuais];
            const signalCount = formatSignals(value);
            const config =
              chave === "positivo"
                ? {
                    label: "Positivas",
                    color: "bg-emerald-500",
                    accent: "text-emerald-300",
                    icon: <TrendingUp size={14} />,
                  }
                : chave === "negativo"
                ? {
                    label: "Negativas",
                    color: "bg-red-500",
                    accent: "text-red-300",
                    icon: <AlertTriangle size={14} />,
                  }
                : {
                    label: "Neutras",
                    color: "bg-sky-500",
                    accent: "text-sky-300",
                    icon: <Brain size={14} />,
                  };

            return (
              <div key={config.label}>
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-2 ${config.accent}`}>
                    {config.icon} {config.label}
                  </span>
                  <span className="text-gray-200">
                    {value}%
                    {signalCount && (
                      <span className="text-[11px] text-gray-500 ml-2">
                        ≈ {signalCount} sinais
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
                  <div className={`h-full ${config.color}`} style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-1 text-[11px] text-gray-500">
          Baseado em fontes analisadas nos últimos minutos — exatamente os mesmos números que alimentam o gráfico ao lado.
        </p>
      </motion.div>
    </AnimatePresence>
  );
}