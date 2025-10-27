"use client";
import React, { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getUltimasNoticias } from "../lib/api";

export default function TweetsList() {
  const [tweets, setTweets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data } = await getUltimasNoticias(20, "twitter");
      setTweets(data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <p className="text-gray-400">Carregando tweets...</p>;

  return (
    <section className="space-y-4">
      {tweets.map((t, i) => (
        <div
          key={i}
          className={`p-4 bg-neutral-900 border-2 rounded-lg border-blue-500 hover:bg-neutral-800`}
        >
          <p className="text-gray-100 text-sm mb-2">{t.title}</p>
          <p className="text-xs text-gray-500 mb-1">
            <strong>Modelo:</strong>{" "}
            <span className="text-blue-400">Twitter-RoBERTa (Crypto)</span>
          </p>
          <p className="text-xs text-gray-500">
            <strong>Sentimento:</strong>{" "}
            <span
              className={
                t.sentimento === "positive"
                  ? "text-green-400"
                  : t.sentimento === "negative"
                  ? "text-red-400"
                  : "text-yellow-400"
              }
            >
              {t.sentimento || "neutro"}
            </span>{" "}
            | Score: {t.score?.toFixed(3)}
          </p>
          <a
            href={t.url}
            target="_blank"
            className="text-blue-400 flex gap-1 mt-2 text-xs"
          >
            Ver no X <ExternalLink size={14} />
          </a>
        </div>
      ))}
    </section>
  );
}
