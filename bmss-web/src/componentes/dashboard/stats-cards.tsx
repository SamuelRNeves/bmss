"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getSentimentColors } from "../utils/sentiment-colors";

interface StatsCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  sentiment?: "positive" | "negative" | "neutral"; // ✅ Agora está definido
}

export function StatsCard({ title, value, change, icon, sentiment }: StatsCardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  // Determinar sentimento automático se não especificado
  const autoSentiment = sentiment || (isPositive ? "positive" : isNeutral ? "neutral" : "negative");
  const colors = getSentimentColors(autoSentiment, Math.abs(change) / 100);

  return (
    <div 
      className="rounded-xl p-6 transition-all duration-300 hover:scale-105 border-2"
      style={{
        background: `linear-gradient(135deg, ${colors.background}, rgba(0,0,0,0.3))`,
        borderColor: colors.border,
        boxShadow: `0 8px 32px ${colors.border}25`
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300">{title}</p>
          <p 
            className="text-2xl font-bold mt-2"
            style={{ color: colors.text }}
          >
            {value}
          </p>
          <div 
            className="flex items-center gap-1 mt-2 text-sm font-medium"
            style={{ color: colors.text }}
          >
            {isPositive ? <TrendingUp size={16} /> : 
             isNeutral ? <Minus size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(change).toFixed(1)}%</span>
            <span className="text-xs opacity-75">
              {isPositive ? 'aumento' : isNeutral ? 'estável' : 'queda'}
            </span>
          </div>
        </div>
        <div style={{ color: colors.text }}>
          {icon}
        </div>
      </div>
    </div>
  );
}