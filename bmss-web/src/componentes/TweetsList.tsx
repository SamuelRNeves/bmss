"use client";

import React, { useEffect, useState } from "react";
import { getUltimosTweets } from "../lib/api";
import { Twitter } from "lucide-react";

interface TweetItem {
  id?: string | number;
  title: string;
  description: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  sentimento?: string;
  score?: number;
  tweetUrl?: string;
  isTweet?: boolean;
}

export default function TweetsList() {
  const [tweets, setTweets] = useState<TweetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTweets() {
      const { data } = await getUltimosTweets(20, "bitcoin");
      setTweets(data || []);
      setLoading(false);
    }

    fetchTweets();
  }, []);

  if (loading) {
    return (
      <div className="text-gray-400 text-center py-4">
        Carregando tweets...
      </div>
    );
  }

  if (!tweets.length) {
    return (
      <div className="text-gray-400 text-center py-4">
        Nenhum tweet encontrado.
      </div>
    );
  }

  const getSentimentStyle = (sentimento?: string) => {
    switch (sentimento) {
      case "positive":
        return { border: "border-green-500", text: "text-green-400", label: "positivo" };
      case "negative":
        return { border: "border-red-500", text: "text-red-400", label: "negativo" };
      default:
        return { border: "border-yellow-400", text: "text-yellow-400", label: "neutro" };
    }
  };

  return (
    <section className="space-y-4">
      {tweets.map((item, index) => {
        const style = getSentimentStyle(item.sentimento);
        const link = item.tweetUrl || item.url;

        return (
          <div
            key={item.id || index}
            className={`p-4 bg-neutral-900 border-2 ${style.border} rounded-lg hover:bg-neutral-800 transition-colors`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Twitter className="text-sky-400" size={18} />
              <h3 className="text-gray-100 font-semibold">
                {item.title || "Tweet"}
              </h3>
            </div>

            <p className="text-gray-400 text-sm mb-2">{item.description}</p>

            {typeof item.score === "number" && (
              <p className="text-gray-500 text-xs mb-1">
                Score: {item.score.toFixed(3)}
              </p>
            )}

            <div className="flex flex-col gap-1 mt-2 text-xs text-gray-400">
              <span>
                <strong>Sentimento:</strong>{" "}
                <span className={style.text}>{style.label}</span>
                {typeof item.score === "number" && (
                  <span className="text-gray-500"> {`(${item.score.toFixed(3)})`}</span>
                )}
              </span>
              {item.publishedAt && (
                <span>
                  <strong>Publicado:</strong>{" "}
                  {new Date(item.publishedAt).toLocaleString("pt-BR")}
                </span>
              )}
              {item.source && (
                <span>
                  <strong>Fonte:</strong> {item.source}
                </span>
              )}
            </div>

            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-sky-400 mt-3 hover:text-sky-300"
              >
                Abrir no X
                <Twitter size={14} className="text-sky-400" />
              </a>
            )}
          </div>
        );
      })}
    </section>
  );
}
