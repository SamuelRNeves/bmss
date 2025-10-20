"use client";

import { getUltimasNoticias } from "../lib/api";
import { useEffect, useState } from "react";

type Noticia = {
  id: number;
  titulo: string;
  fonte: string;
  resumo: string;
  sentimento: "positive" | "neutral" | "negative";
};

export default function NewsList() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);

  useEffect(() => {
    getUltimasNoticias()
      .then((data) => setNoticias(data))
      .catch(() => console.error("Erro ao carregar notícias"));
  }, []);

  // Mock de dados (futuramente virá do endpoint /noticias/top5)
  useEffect(() => {
    setTimeout(() => {
      setNoticias([
        {
          id: 1,
          titulo: "Mercado reage a novo ETF de Bitcoin aprovado nos EUA",
          fonte: "CoinDesk",
          resumo:
            "A aprovação do novo ETF de Bitcoin impulsionou o mercado, trazendo otimismo entre investidores.",
          sentimento: "positive",
        },
        {
          id: 2,
          titulo: "Analistas alertam para possível correção após alta recente",
          fonte: "Investing",
          resumo:
            "Especialistas apontam que o BTC pode enfrentar resistência em níveis de preço atuais.",
          sentimento: "neutral",
        },
        {
          id: 3,
          titulo: "Hack em exchange gera instabilidade no mercado",
          fonte: "CryptoNews",
          resumo:
            "Um ataque cibernético a uma grande exchange causou queda temporária no valor do Bitcoin.",
          sentimento: "negative",
        },
      ]);
    }, 1000);
  }, []);

  const getColor = (sentimento: string) => {
    switch (sentimento) {
      case "positive":
        return "bg-green-600 text-white";
      case "neutral":
        return "bg-yellow-500 text-black";
      case "negative":
        return "bg-red-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-inner">
      <h2 className="text-lg font-semibold text-gray-100 mb-4">
        Últimas 5 Notícias Analisadas
      </h2>

      {noticias.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Nenhuma notícia encontrada. Importe ou cadastre notícias.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {noticias.map((noticia) => (
            <div
              key={noticia.id}
              className="flex flex-col md:flex-row md:items-center justify-between bg-neutral-800 rounded-lg p-4 border border-neutral-700 hover:border-yellow-500 transition"
            >
              <div className="flex-1">
                <h3 className="text-gray-100 font-medium">{noticia.titulo}</h3>
                <p className="text-gray-400 text-sm">{noticia.resumo}</p>
                <span className="text-xs text-gray-500">Fonte: {noticia.fonte}</span>
              </div>

              <div className="mt-3 md:mt-0">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${getColor(
                    noticia.sentimento
                  )}`}
                >
                  {noticia.sentimento === "positive"
                    ? "Positivo"
                    : noticia.sentimento === "neutral"
                    ? "Neutro"
                    : "Negativo"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
