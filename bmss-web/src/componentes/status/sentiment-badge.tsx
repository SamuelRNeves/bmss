"use client";

import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

interface SentimentBadgeProps {
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  count?: number;
  showTrend?: boolean;
}

export function SentimentBadge({ sentiment, score, count, showTrend = false }: SentimentBadgeProps) {
  const config = {
    positive: { 
      icon: TrendingUp, 
      color: "text-green-400", 
      bg: "bg-green-400/10",
      border: "border-green-400/20",
      label: "Positivo"
    },
    negative: { 
      icon: TrendingDown, 
      color: "text-red-400", 
      bg: "bg-red-400/10",
      border: "border-red-400/20",
      label: "Negativo"
    },
    neutral: { 
      icon: Minus, 
      color: "text-yellow-400", 
      bg: "bg-yellow-400/10", 
      border: "border-yellow-400/20",
      label: "Neutro"
    },
  };

  const { icon: Icon, color, bg, border, label } = config[sentiment];
  const confidence = Math.round(score * 100);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${bg} ${border} ${color} text-sm`}>
      <Icon size={14} />
      <span className="font-medium">{label}</span>
      <span className="text-xs opacity-75">({confidence}%)</span>
      {count && (
        <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded">
          {count}
        </span>
      )}
      {showTrend && sentiment !== "neutral" && (
        <span className="text-xs">
          {sentiment === "positive" ? "↗" : "↘"}
        </span>
      )}
    </div>
  );
}