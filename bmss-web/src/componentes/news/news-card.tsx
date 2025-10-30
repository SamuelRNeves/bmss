"use client";

import { ExternalLink, Calendar, Twitter, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getSentimentColors, getSentimentGradient } from "../utils/sentiment-colors";

interface NewsCardProps {
  title: string;
  description: string;
  source: string;
  date: string;
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  url: string;
  isTweet?: boolean;
  tweetUrl?: string;
}

export function NewsCard({ 
  title, 
  description, 
  source, 
  date, 
  sentiment, 
  score, 
  url,
  isTweet = false,
  tweetUrl 
}: NewsCardProps) {
  const colors = getSentimentColors(sentiment, score);
  const gradient = getSentimentGradient(sentiment, score);

  const sentimentConfig = {
    positive: { 
      icon: TrendingUp, 
      label: "Positivo",
      emoji: "🚀"
    },
    negative: { 
      icon: TrendingDown, 
      label: "Negativo",
      emoji: "📉"
    },
    neutral: { 
      icon: Minus, 
      label: "Neutro",
      emoji: "⚖️"
    },
  };

  const config = sentimentConfig[sentiment];
  const IconComponent = config.icon;
  const displayUrl = isTweet && tweetUrl ? tweetUrl : url;

  // Formatar a data
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Data inválida';
    }
  };

  // Calcular a confiança (score de 0 a 100)
  const confidence = Math.round(score * 100);

  return (
    <div 
      className="rounded-xl p-6 transition-all duration-300 group hover:scale-[1.02] h-full flex flex-col border-2"
      style={{
        background: gradient,
        borderColor: colors.border,
        boxShadow: `0 4px 20px ${colors.border}20`
      }}
    >
      {/* Header com Sentimento */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Ícone do Tweet (se for tweet) */}
          {isTweet && <Twitter size={14} className="text-blue-400" />}
          
          {/* Badge de Sentimento */}
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: colors.badge,
              color: colors.text
            }}
          >
            <IconComponent size={12} />
            <span>{config.label}</span>
            <span className="text-xs opacity-80">({confidence}%)</span>
            <span>{config.emoji}</span>
          </div>
        </div>
        
        {/* Link Externo */}
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          style={{ color: colors.text }}
        >
          <ExternalLink size={16} />
        </a>
      </div>

      {/* Título */}
      <h3 
        className="font-semibold mb-2 line-clamp-2 group-hover:underline transition-all flex-1"
        style={{ color: colors.text }}
      >
        {title}
      </h3>
      
      {/* Descrição */}
      <p className="text-sm mb-4 line-clamp-3 flex-1 text-gray-200">
        {description || "Sem descrição disponível"}
      </p>

      {/* Footer com Metadados */}
      <div className="flex items-center justify-between text-xs mt-auto">
        <div className="flex items-center gap-4 text-gray-300">
          {/* Data */}
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {formatDate(date)}
          </span>
          
          {/* Fonte */}
          <span className="bg-black/30 px-2 py-1 rounded">
            {source}
          </span>
        </div>
        
        {/* Indicador de Tipo */}
        {isTweet ? (
          <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
            Tweet
          </span>
        ) : (
          <span className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded text-xs">
            Notícia
          </span>
        )}
      </div>

      {/* Barra de Confiança (Score) */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Confiança da análise:</span>
          <span>{confidence}%</span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-1.5">
          <div 
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${confidence}%`,
              backgroundColor: colors.text
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}