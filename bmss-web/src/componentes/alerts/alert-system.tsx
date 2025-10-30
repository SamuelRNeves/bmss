"use client";

import { AlertTriangle, Info, CheckCircle, X, Twitter, Newspaper } from "lucide-react";
import { useState } from "react";
import { getSentimentColors } from "../utils/sentiment-colors";

interface Alert {
  id: string;
  type: "info" | "warning" | "success" | "error" | "news" | "tweet";
  title: string;
  message: string;
  timestamp: Date;
  sentiment?: "positive" | "negative" | "neutral";
  score?: number;
}

export function AlertSystem() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      type: "news",
      title: "Nova Análise Concluída",
      message: "15 notícias analisadas com sucesso",
      timestamp: new Date(),
      sentiment: "positive",
      score: 0.8
    },
    {
      id: "2",
      type: "tweet",
      title: "Tweet Negativo Detectado",
      message: "Alta negatividade em tweets sobre Bitcoin",
      timestamp: new Date(Date.now() - 300000),
      sentiment: "negative",
      score: 0.7
    },
    {
      id: "3",
      type: "warning",
      title: "Alta Volatilidade",
      message: "Mercado apresentando alta volatilidade",
      timestamp: new Date(Date.now() - 600000),
    }
  ]);

  const removeAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const getAlertConfig = (alert: Alert) => {
    const baseConfig = {
      info: { icon: Info, color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)" },
      warning: { icon: AlertTriangle, color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)" },
      success: { icon: CheckCircle, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)" },
      error: { icon: X, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)" },
      news: { icon: Newspaper, color: "#8b5cf6", bgColor: "rgba(139, 92, 246, 0.1)" },
      tweet: { icon: Twitter, color: "#1da1f2", bgColor: "rgba(29, 161, 242, 0.1)" },
    };

    // Se for news ou tweet com sentimento, usar cores do sentimento
    if ((alert.type === "news" || alert.type === "tweet") && alert.sentiment) {
      const sentimentColors = getSentimentColors(alert.sentiment, alert.score || 0.5);
      return {
        icon: baseConfig[alert.type].icon,
        color: sentimentColors.text,
        bgColor: sentimentColors.background
      };
    }

    return baseConfig[alert.type];
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {alerts.map((alert) => {
        const { icon: Icon, color, bgColor } = getAlertConfig(alert);
        
        return (
          <div
            key={alert.id}
            className="rounded-lg p-4 shadow-lg transform transition-all duration-300 hover:scale-105 border"
            style={{
              backgroundColor: bgColor,
              borderColor: color,
              boxShadow: `0 8px 32px ${color}25`
            }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="p-2 rounded-full"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 
                    className="font-semibold text-sm"
                    style={{ color }}
                  >
                    {alert.title}
                  </h4>
                  <button
                    onClick={() => removeAlert(alert.id)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <p className="text-gray-200 text-sm mt-1">
                  {alert.message}
                </p>
                
                {/* Badge de sentimento para news/tweets */}
                {(alert.type === "news" || alert.type === "tweet") && alert.sentiment && (
                  <div className="flex items-center gap-2 mt-2">
                    <div 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${color}20`,
                        color: color
                      }}
                    >
                      {alert.sentiment === "positive" ? "😊 Positivo" : 
                       alert.sentiment === "negative" ? "😞 Negativo" : "😐 Neutro"}
                      {alert.score && ` (${Math.round(alert.score * 100)}%)`}
                    </div>
                  </div>
                )}
                
                <p className="text-gray-400 text-xs mt-2">
                  {alert.timestamp.toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}