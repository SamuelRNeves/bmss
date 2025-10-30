export interface SentimentColors {
    background: string;
    border: string;
    text: string;
    icon: string;
    badge: string;
  }
  
  export const getSentimentColors = (sentiment: "positive" | "negative" | "neutral", score: number): SentimentColors => {
    // Intensidade baseada no score (0.0 a 1.0)
    const intensity = Math.min(1, score * 1.5); // Aumenta um pouco a intensidade
    
    switch (sentiment) {
      case "positive":
        return {
          background: `rgba(16, 185, 129, ${0.05 + intensity * 0.1})`,
          border: `rgba(16, 185, 129, ${0.3 + intensity * 0.4})`,
          text: "#10b981",
          icon: "#10b981",
          badge: `rgba(16, 185, 129, ${0.2 + intensity * 0.3})`
        };
      
      case "negative":
        return {
          background: `rgba(239, 68, 68, ${0.05 + intensity * 0.1})`,
          border: `rgba(239, 68, 68, ${0.3 + intensity * 0.4})`,
          text: "#ef4444",
          icon: "#ef4444",
          badge: `rgba(239, 68, 68, ${0.2 + intensity * 0.3})`
        };
      
      case "neutral":
      default:
        return {
          background: `rgba(245, 158, 11, ${0.05 + intensity * 0.1})`,
          border: `rgba(245, 158, 11, ${0.3 + intensity * 0.4})`,
          text: "#f59e0b",
          icon: "#f59e0b",
          badge: `rgba(245, 158, 11, ${0.2 + intensity * 0.3})`
        };
    }
  };
  
  export const getSentimentGradient = (sentiment: "positive" | "negative" | "neutral", score: number): string => {
    const intensity = Math.min(1, score * 1.5);
    
    switch (sentiment) {
      case "positive":
        return `linear-gradient(135deg, rgba(16, 185, 129, ${0.05 + intensity * 0.05}), rgba(5, 150, 105, ${0.08 + intensity * 0.07}))`;
      
      case "negative":
        return `linear-gradient(135deg, rgba(239, 68, 68, ${0.05 + intensity * 0.05}), rgba(220, 38, 38, ${0.08 + intensity * 0.07}))`;
      
      case "neutral":
      default:
        return `linear-gradient(135deg, rgba(245, 158, 11, ${0.05 + intensity * 0.05}), rgba(217, 119, 6, ${0.08 + intensity * 0.07}))`;
    }
  };