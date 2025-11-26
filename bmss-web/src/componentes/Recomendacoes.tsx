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
  Clock3,
} from "lucide-react";
import { useAuth, INVESTOR_PROFILE_STORAGE_KEY } from "@/lib/useAuth";
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

interface TacticalInsight {
  titulo: string;
  detalhe: string;
  destaque: "risco" | "oportunidade" | "neutro";
  icone: JSX.Element;
}

interface PurchaseGuidance {
  status: "comprar" | "observar" | "evitar";
  titulo: string;
  detalhe: string;
}

const formatScore = (score: number): string =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(score);

const toNumber = (value: unknown, fallback = 0): number => {
  const coerced = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(coerced) ? coerced : fallback;
};

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

const loadPersistedProfile = (): InvestorProfile | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(INVESTOR_PROFILE_STORAGE_KEY);
  return normalizeProfile(raw);
};

const computeConvictionScore = (snapshot: SentimentSnapshot): number => {
  const coverageScore = clampRatio(snapshot.totalItens / 180);
  const dominanceScore = clampRatio(snapshot.proporcaoDominante);
  const intensityScore = snapshot.intensidade === "forte" ? 1 : snapshot.intensidade === "moderada" ? 0.72 : 0.45;
  const directionalScore = clampRatio(Math.abs(snapshot.media) / 0.16);

  const totalDistribuicao =
    snapshot.distribuicao.positivo + snapshot.distribuicao.negativo + snapshot.distribuicao.neutro || 1;
  const percentualPositivo = clampRatio(snapshot.distribuicao.positivo / totalDistribuicao);
  const percentualNegativo = clampRatio(snapshot.distribuicao.negativo / totalDistribuicao);
  const balanceScore = 1 - clampRatio(Math.abs(percentualPositivo - percentualNegativo));

  const weighted =
    coverageScore * 0.28 +
    dominanceScore * 0.26 +
    intensityScore * 0.18 +
    directionalScore * 0.16 +
    balanceScore * 0.12;

  return Number(weighted.toFixed(2));
};

const resolveConfidenceLabel = (score: number): "alta" | "moderada" | "baixa" => {
  if (score >= 0.7) return "alta";
  if (score >= 0.45) return "moderada";
  return "baixa";
};

const buildPurchaseGuidance = (
  perfil: InvestorProfile,
  percentualPositivo: number,
  percentualNeutro: number,
  percentualNegativo: number
): PurchaseGuidance => {
  const viesLiquidez = percentualNeutro >= 0.2;
  const margemPositiva = percentualPositivo - percentualNegativo;
  const choqueVendedor = percentualNegativo >= 0.65;
  const vantagemNegativa = percentualNegativo - percentualPositivo;
  const neutroAmortecedor = percentualNeutro >= 0.55;

  if (perfil === "AGRESSIVO") {
    if (choqueVendedor && percentualPositivo < 0.08) {
      return {
        status: "evitar",
        titulo: "Pressão vendedora dominante",
        detalhe:
          "Mesmo tolerando ruído, o perfil agressivo preserva munição quando o negativo passa de 65% e o positivo não reage. Foque em trades curtos ou espere alívio.",
      };
    }

    if (percentualPositivo >= 0.03 && (viesLiquidez || margemPositiva > -0.15)) {
      return {
        status: "comprar",
        titulo: "Janela tática aberta",
        detalhe:
          "Com 3%+ de sinais positivos e pelo menos 20% neutros, há espaço para entradas rápidas com stops curtos. O agressivo prioriza velocidade e aceita drawdown de curto prazo.",
      };
    }

    if (vantagemNegativa > 0.12 && !neutroAmortecedor) {
      return {
        status: "observar",
        titulo: "Venda ainda fala mais alto",
        detalhe:
          "Negativo supera o positivo e o neutro não está amortecendo bem. O agressivo pode operar contrarian em prazos curtos, mas sem travar capital em posições longas.",
      };
    }

    return {
      status: "observar",
      titulo: "Paciência estratégica",
      detalhe:
        "Espere o neutro subir para perto de 30% ou o positivo reagir antes de alavancar. Preserve liquidez para capturar rompimentos com stops curtos.",
    };
  }

  if (perfil === "MODERADO") {
    if (
      percentualPositivo >= 0.15 &&
      percentualNegativo <= 0.4 &&
      (percentualPositivo >= percentualNegativo || neutroAmortecedor)
    ) {
      return {
        status: "comprar",
        titulo: "Compras graduais liberadas",
        detalhe:
          "Balanceado entre prudência e oportunidade: com 15%+ positivos, venda contida e neutro amortecendo, o moderado pode comprar em parcelas, mantendo stops mais folgados.",
      };
    }

    if (percentualNegativo >= 0.6 || margemPositiva <= -0.2) {
      return {
        status: "evitar",
        titulo: "Cenário frágil para novas posições",
        detalhe: "Sentimento negativo muito alto ou vantagem vendedora relevante. Preservar capital e aguardar que o neutro volte a amortecer o risco.",
      };
    }

    if (vantagemNegativa >= 0.08 && !neutroAmortecedor) {
      return {
        status: "observar",
        titulo: "Aguardar reequilíbrio",
        detalhe:
          "O negativo ainda supera o positivo. Espere o neutro segurar melhor a volatilidade ou o positivo virar a liderança antes de novas compras.",
      };
    }

    return {
      status: "observar",
      titulo: "Aguardando confirmação",
      detalhe:
        "Priorize equilíbrio: monte posições pequenas quando houver neutro acima de 20% e espere o positivo superar o negativo antes de acelerar compras.",
    };
  }

  // Perfil CONSERVADOR
  if (percentualPositivo >= 0.2 && percentualNegativo <= 0.3 && percentualNeutro >= 0.2) {
    return {
      status: "comprar",
      titulo: "Entrada seletiva permitida",
      detalhe:
        "O conservador teme quedas de curto prazo; por isso exige 20%+ de sinais positivos, neutro robusto e venda contida para iniciar posições protegidas e menores.",
    };
  }

  if (percentualNegativo >= 0.45 || margemPositiva < -0.1) {
    return {
      status: "evitar",
      titulo: "Preservar capital",
      detalhe: "Ambiente defensivo para o conservador. Fique em caixa ou ativos estáveis até que a pressão vendedora recue e o neutro volte a amortecer a volatilidade.",
    };
  }

  return {
    status: "observar",
    titulo: "Monitorando sinais",
    detalhe:
      "Mantenha postura cautelosa; o conservador espera que o positivo fique mais encorpado e que o negativo permaneça abaixo de 30% antes de alocar novo capital.",
  };
};

const buildTacticalInsights = (
  perfil: InvestorProfile,
  snapshot: SentimentSnapshot
): TacticalInsight[] => {
  const insights: TacticalInsight[] = [];
  const conviction = computeConvictionScore(snapshot);
  const dominancePercent = Math.round(clampRatio(snapshot.proporcaoDominante) * 100);
  const biasLabel = snapshot.dominante;
  const isPositive = biasLabel === "positivo";
  const isNegative = biasLabel === "negativo";

  if (snapshot.totalItens < 60) {
    insights.push({
      titulo: "Confirmação limitada",
      detalhe:
        "Volume de notícias ainda baixo. Use tamanhos reduzidos e aguarde mais sinais para validar o cenário.",
      destaque: "risco",
      icone: <Brain size={14} className="text-amber-300" />,
    });
  }

  if (isPositive) {
    if (perfil === "AGRESSIVO") {
      insights.push({
        titulo: "Romper com stops móveis",
        detalhe: `Otimismo domina ${dominancePercent}% das fontes. Trabalhe pivôs rápidos e atualize stops conforme o fluxo acelera.`,
        destaque: "oportunidade",
        icone: <Flame size={14} className="text-emerald-300" />,
      });
    } else if (perfil === "MODERADO") {
      insights.push({
        titulo: "Aportes graduais",
        detalhe: `Use compras parceladas e realize lucros parciais conforme o sentimento positivo (${dominancePercent}%) se mantém.`,
        destaque: "neutro",
        icone: <TrendingUp size={14} className="text-lime-300" />,
      });
    } else {
      insights.push({
        titulo: "Proteções ativas",
        detalhe: "Prefira produtos com hedge embutido e limite a exposição direta para capturar o humor positivo sem descuidar da defesa.",
        destaque: "neutro",
        icone: <ShieldCheck size={14} className="text-yellow-200" />,
      });
    }
  } else if (isNegative) {
    if (perfil === "AGRESSIVO") {
      insights.push({
        titulo: "Operar reversões curtas",
        detalhe: `Noticiário negativo (${dominancePercent}%) favorece entradas escalonadas em suportes e saídas rápidas se o fluxo virar.`,
        destaque: "risco",
        icone: <AlertTriangle size={14} className="text-red-300" />,
      });
    } else if (perfil === "MODERADO") {
      insights.push({
        titulo: "Reduzir beta da carteira",
        detalhe: "Priorize ativos defensivos, alongue stops e mantenha liquidez para recomprar quando os sinais melhorarem.",
        destaque: "risco",
        icone: <ShieldAlert size={14} className="text-orange-300" />,
      });
    } else {
      insights.push({
        titulo: "Coberturas obrigatórias",
        detalhe: "Trave parte das posições com derivativos ou stablecoins enquanto o fluxo permanece negativo.",
        destaque: "risco",
        icone: <ShieldCheck size={14} className="text-rose-200" />,
      });
    }
  } else {
    insights.push({
      titulo: "Mercado lateral",
      detalhe: "Mapeie gatilhos técnicos e espere confirmação antes de aumentar o risco, pois o sentimento segue neutro.",
      destaque: "neutro",
      icone: <Brain size={14} className="text-sky-300" />,
    });
  }

  if (conviction < 0.45) {
    insights.push({
      titulo: "Confiança limitada",
      detalhe: "Sinais divergentes. Use posições piloto e deixe que novos dados confirmem a direção.",
      destaque: "risco",
      icone: <RefreshCw size={14} className="text-amber-200" />,
    });
  } else if (conviction >= 0.7) {
    insights.push({
      titulo: "Convicção elevada",
      detalhe: "Fluxo consistente: mantenha o plano atual, mas proteja lucros com ajustes periódicos.",
      destaque: "oportunidade",
      icone: <ShieldCheck size={14} className="text-emerald-200" />,
    });
  }

  return insights.slice(0, 3);
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
  const [perfil, setPerfil] = useState<InvestorProfile | null>(() => loadPersistedProfile());

  useEffect(() => {
    const resolved = normalizeProfile(user?.investorProfile);
    if (resolved) {
      setPerfil(resolved);
    }
  }, [user?.investorProfile]);

  useEffect(() => {
    if (!isLoadingUser && perfil === null) {
      const stored = loadPersistedProfile();
      if (stored) {
        setPerfil(stored);
        return;
      }
      setPerfil("MODERADO");
    }
  }, [isLoadingUser, perfil]);

  useEffect(() => {
    if (!perfil || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(INVESTOR_PROFILE_STORAGE_KEY, perfil);
  }, [perfil]);

  const snapshotAtual = useMemo(() => {
    if (!snapshot) return createDefaultSnapshot();
    const distribuicaoSanitizada = {
      positivo: toNumber(snapshot.distribuicao.positivo),
      negativo: toNumber(snapshot.distribuicao.negativo),
      neutro: toNumber(snapshot.distribuicao.neutro),
    };

    const totalDistribuicao =
      distribuicaoSanitizada.positivo +
      distribuicaoSanitizada.negativo +
      distribuicaoSanitizada.neutro;

    if (totalDistribuicao <= 0) {
      return createDefaultSnapshot();
    }

    return {
      ...snapshot,
      media: toNumber(snapshot.media),
      totalItens: toNumber(snapshot.totalItens),
      proporcaoDominante: clampRatio(toNumber(snapshot.proporcaoDominante)),
      distribuicao: distribuicaoSanitizada,
    } satisfies SentimentSnapshot;
  }, [snapshot]);
  
  const convictionScore = useMemo(() => computeConvictionScore(snapshotAtual), [snapshotAtual]);
  const convictionLabel = resolveConfidenceLabel(convictionScore);
  const confidenceBreakdown = useMemo(() => {
    const base = snapshotAtual.totalItens > 0
      ? `${new Intl.NumberFormat("pt-BR").format(snapshotAtual.totalItens)} sinais analisados`
      : "Base ainda reduzida";
    const dominance = `${formatPercent(snapshotAtual.proporcaoDominante)} ${snapshotAtual.dominante}`;
    const mean = `média ${formatScore(snapshotAtual.media)}`;

    return `${base} • ${dominance} • ${mean}`;
  }, [snapshotAtual]);
  const tacticalInsights = useMemo(() => {
    if (!perfil) return [];
    return buildTacticalInsights(perfil, snapshotAtual);
  }, [perfil, snapshotAtual]);

  const recomendacao = useMemo(() => {
    if (!perfil) return null;
    return buildRecommendation(perfil, snapshotAtual);
  }, [perfil, snapshotAtual]);

  const purchaseGuidance = useMemo(() => {
    if (!perfil) return null;
    const { distribuicao } = snapshotAtual;
    const totalDistribuicao =
      distribuicao.positivo + distribuicao.negativo + distribuicao.neutro;
    const positivo = clampRatio(distribuicao.positivo / (totalDistribuicao || 1));
    const neutro = clampRatio(distribuicao.neutro / (totalDistribuicao || 1));
    const negativo = clampRatio(distribuicao.negativo / (totalDistribuicao || 1));

    return buildPurchaseGuidance(perfil, positivo, neutro, negativo);
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
    positivo: Number(snapshotAtual.distribuicao.positivo.toFixed(1)),
    neutro: Number(snapshotAtual.distribuicao.neutro.toFixed(1)),
    negativo: Number(snapshotAtual.distribuicao.negativo.toFixed(1)),
  };

  const [renderedAt] = useState<Date>(() => new Date());

  const pulseHeadline = useMemo(() => {
    const intensidadeTexto =
      snapshotAtual.intensidade === "forte"
        ? "de alta voltagem"
        : snapshotAtual.intensidade === "moderada"
        ? "com ritmo moderado"
        : "de baixa intensidade";

    if (snapshotAtual.dominante === "positivo") {
      return `Fluxo otimista ${intensidadeTexto}`;
    }

    if (snapshotAtual.dominante === "negativo") {
      return `Clima defensivo ${intensidadeTexto}`;
    }

    return `Mercado equilibrado ${intensidadeTexto}`;
  }, [snapshotAtual.dominante, snapshotAtual.intensidade]);

  const pulseDetails = useMemo(() => {
    const total = snapshotAtual.totalItens || 0;
    const totalTexto = total
      ? `${new Intl.NumberFormat("pt-BR").format(total)} análises recentes`
      : "Base em atualização";

    return `${totalTexto}: ${percentuais.positivo}% positivas, ${percentuais.neutro}% neutras e ${percentuais.negativo}% negativas.`;
  }, [percentuais.negativo, percentuais.neutro, percentuais.positivo, snapshotAtual.totalItens]);

  const pulseTimestamp = useMemo(
    () =>
      renderedAt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [renderedAt]
  );

  const legendaSugestoes = [
    "Agressivo prioriza velocidade e upside; aceita perdas de curto prazo e pode comprar com respingos positivos mínimos, mas pausa se o negativo dominar sem neutro para amortecer.",
    "Moderado busca equilíbrio: prefere neutro amortecendo volatilidade e só acelera quando o positivo lidera ou o neutro passa de ~55% para blindar quedas rápidas.",
    "Conservador protege capital: teme quedas no curto prazo, só entra com positivo robusto (20%+), neutro forte e negativo controlado.",
    "Se o negativo superar o positivo sem colchão neutro, o sistema reduz compras para moderado/conservador e sugere observar. Neutro alto funciona como colchão; negativo alto trava compras.",
  ];

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
              <span className="px-2 py-0.5 rounded-full bg-neutral-800/70 text-gray-300">
                Confiança do sinal • {Math.round(convictionScore * 100)}% ({convictionLabel})
              </span>
              {isLoading && (
                <span className="flex items-center gap-1 text-amber-300">
                  <RefreshCw size={12} className="animate-spin" /> Atualizando
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/90">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <Clock3 size={14} className="text-sky-300" />
                {pulseHeadline}
              </span>
              <span className="text-xs text-gray-400">• {pulseTimestamp}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{pulseDetails}</p>
            <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-neutral-800/60 text-gray-300 border border-neutral-700/70">
                {confidenceBreakdown}
              </span>
              <span className="text-emerald-300/80">
                Coerência = cobertura + dominância + intensidade + equilíbrio
              </span>
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

        {purchaseGuidance && (
          <div className="rounded-2xl bg-neutral-950/50 border border-neutral-800/70 p-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-gray-200">
                Sugestão de compra
              </span>
              <span
                className={`px-2 py-0.5 rounded-full border text-xs ${
                  purchaseGuidance.status === "comprar"
                    ? "border-emerald-500 text-emerald-300 bg-emerald-500/10"
                    : purchaseGuidance.status === "evitar"
                    ? "border-red-500 text-red-300 bg-red-500/10"
                    : "border-amber-500 text-amber-300 bg-amber-500/10"
                }`}
              >
                {purchaseGuidance.status === "comprar"
                  ? "Compra liberada"
                  : purchaseGuidance.status === "evitar"
                  ? "Aguardando sinal seguro"
                  : "Observar antes de entrar"}
              </span>
            </div>
            <p className="text-sm font-semibold text-white">{purchaseGuidance.titulo}</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              {purchaseGuidance.detalhe}
            </p>
            <div className="mt-3 text-[11px] text-gray-500 space-y-1">
              <p className="font-medium text-gray-300">Legenda do sistema:</p>
              <ul className="list-disc list-inside space-y-1">
                {legendaSugestoes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

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

        {tacticalInsights.length > 0 && (
          <div className="mt-4 rounded-2xl bg-neutral-950/40 border border-neutral-800/80 p-4">
            <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">
              Plano tático personalizado
            </p>
            <div className="space-y-3">
              {tacticalInsights.map((insight) => (
                <div key={insight.titulo} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 ${
                      insight.destaque === "oportunidade"
                        ? "text-emerald-300"
                        : insight.destaque === "risco"
                        ? "text-amber-300"
                        : "text-sky-300"
                    }`}
                  >
                    {insight.icone}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{insight.titulo}</p>
                    <p className="text-[11px] text-gray-400 leading-snug">{insight.detalhe}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-1 text-[11px] text-gray-500">
          Baseado em fontes analisadas nos últimos minutos — exatamente os mesmos números que alimentam o gráfico ao lado.
        </p>
      </motion.div>
    </AnimatePresence>
  );
}