import { useState, useEffect } from 'react';

interface DashboardStats {
  totalNews: number;
  totalTweets: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  lastUpdated: string;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalNews: 0,
    totalTweets: 0,
    positivePercentage: 0,
    negativePercentage: 0,
    neutralPercentage: 0,
    lastUpdated: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === 'development' ? 'http://localhost:8080/api/v1' : undefined);

  const fetchStats = async () => {
    try {
      if (!API_BASE_URL) {
        throw new Error('API base URL não configurada');
      }

      const [newsResponse, tweetsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/noticias/ultimas?limit=50&q=bitcoin`),
        fetch(`${API_BASE_URL}/noticias/tweets/ultimos?limit=50&q=bitcoin`)
      ]);

      const newsData = await newsResponse.json();
      const tweetsData = await tweetsResponse.json();

      const newsItems = newsData.data || [];
      const tweetItems = tweetsData.data || [];
      const allItems = [...newsItems, ...tweetItems];

      const sentimentCounts = {
        positive: 0,
        negative: 0,
        neutral: 0
      };

      allItems.forEach(item => {
        if (item.sentimento === 'positive') sentimentCounts.positive++;
        else if (item.sentimento === 'negative') sentimentCounts.negative++;
        else sentimentCounts.neutral++;
      });

      const totalItems = allItems.length;
      const positivePercentage = totalItems > 0 ? (sentimentCounts.positive / totalItems) * 100 : 0;
      const negativePercentage = totalItems > 0 ? (sentimentCounts.negative / totalItems) * 100 : 0;
      const neutralPercentage = totalItems > 0 ? (sentimentCounts.neutral / totalItems) * 100 : 0;

      setStats({
        totalNews: newsItems.length,
        totalTweets: tweetItems.length,
        positivePercentage: Math.round(positivePercentage),
        negativePercentage: Math.round(negativePercentage),
        neutralPercentage: Math.round(neutralPercentage),
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stats, isLoading, refetch: fetchStats };
}