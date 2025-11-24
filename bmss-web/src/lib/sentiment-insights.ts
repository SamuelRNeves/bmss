export type InvestorProfile = "CONSERVADOR" | "MODERADO" | "AGRESSIVO";

export type SentimentLabel = "positivo" | "negativo" | "neutro";
export type SentimentStrength = "forte" | "moderada" | "leve";

export interface SentimentDistribution {
  positivo: number;
  negativo: number;
  neutro: number;
}

export interface SentimentSnapshot {
  nivel: SentimentLabel;
  intensidade: SentimentStrength;
  media: number;
  distribuicao: SentimentDistribution;
  dominante: SentimentLabel;
  proporcaoDominante: number;
  totalItens: number;
}

export const SENTIMENT_THRESHOLDS = {
  positivo: 0.06,
  negativo: -0.06,
  intensidadeForte: 0.16,
  intensidadeModerada: 0.09,
};

export const clampRatio = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const sanitizePercentage = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
};

const withFallbackDistribution = (
  distribution?: Partial<SentimentDistribution>
): SentimentDistribution => {
  const positivo = sanitizePercentage(distribution?.positivo ?? 0);
  const negativo = sanitizePercentage(distribution?.negativo ?? 0);
  const neutro = sanitizePercentage(distribution?.neutro ?? 0);

  const total = positivo + negativo + neutro;
  if (total === 0) {
    return { positivo: 34, negativo: 33, neutro: 33 };
  }

  return { positivo, negativo, neutro };
};

export const createDefaultSnapshot = (): SentimentSnapshot => ({
  nivel: "neutro",
  intensidade: "leve",
  media: 0,
  distribuicao: { positivo: 34, negativo: 33, neutro: 33 },
  dominante: "neutro",
  proporcaoDominante: 0.34,
  totalItens: 0,
});

interface SnapshotInput {
  media: number;
  distribuicao: SentimentDistribution;
  totalItens: number;
}

export const createSnapshotFromDistribution = ({
  media,
  distribuicao,
  totalItens,
}: SnapshotInput): SentimentSnapshot => {
  const safeDistribution = withFallbackDistribution(distribuicao);
  const soma =
    safeDistribution.positivo + safeDistribution.negativo + safeDistribution.neutro || 1;

  const dominanteEntry = (Object.entries(safeDistribution) as Array<[
    SentimentLabel,
    number
  ]>).sort((a, b) => Number(b[1]) - Number(a[1]))[0] ?? ["neutro", 0];

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

  return {
    nivel,
    intensidade,
    media,
    distribuicao: safeDistribution,
    dominante: dominanteEntry[0],
    proporcaoDominante: clampRatio(dominanteEntry[1] / soma),
    totalItens: Math.max(0, Math.round(totalItens)),
  };
};
