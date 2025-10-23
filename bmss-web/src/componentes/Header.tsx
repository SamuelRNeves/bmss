"use client";

import { RefreshCcw, Search } from "lucide-react";
import {
  atualizarNoticias,
  getSentimentos,
  reanalisarNoticias,
} from "../lib/api";
import { useState, useEffect, useCallback } from "react";

const broadcastNews = (data: unknown) => {
  window.dispatchEvent(new CustomEvent("news-updated", { detail: data }));
};

const broadcastSentiments = (data: unknown) => {
  window.dispatchEvent(new CustomEvent("sentiments-updated", { detail: data }));
};

export default function Header() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const atualizarDashboard = useCallback(
    async (
      mensagemInicio: string,
      mensagemSucesso: string,
      acaoNoticias: () => Promise<unknown>
    ) => {
      try {
        setLoading(true);
        setMessage(mensagemInicio);

        const [sentimentos, noticias] = await Promise.all([
          getSentimentos(),
          acaoNoticias(),
        ]);

        broadcastSentiments(sentimentos);
        broadcastNews(noticias);

        setMessage(mensagemSucesso);
      } catch (error) {
        console.error(error);
        setMessage("❌ Falha ao atualizar o dashboard");
      } finally {
        setLoading(false);
        setTimeout(() => setMessage(""), 5000);
      }
    },
    []
  );

  // 🔄 Atualização manual
  const handleUpdate = () =>
    atualizarDashboard(
      "Atualizando dados...",
      "✅ Dashboard atualizado com sucesso!",
      atualizarNoticias
    );

  const handleAnalyzeLast5 = () =>
    atualizarDashboard(
      "Analisando as últimas notícias...",
      "✅ Análise concluída com sucesso!",
      reanalisarNoticias
    );

  // ⏱ Atualização automática a cada 60 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      atualizarDashboard(
        "⏱ Atualização automática...",
        "✅ Dashboard sincronizado!",
        atualizarNoticias
      );
    }, 60000); // 60.000 ms = 60 segundos

    return () => clearInterval(intervalo); // limpa o timer ao desmontar
  }, [atualizarDashboard]);

  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
      <h1 className="text-2xl font-bold text-gray-100">
        Dashboard de Sentimento
      </h1>

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-60"
        >
          <RefreshCcw size={18} />
          {loading ? "Atualizando..." : "Atualizar Lista"}
        </button>

        <button
          onClick={handleAnalyzeLast5}
          disabled={loading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-60"
        >
          <Search size={18} />
          Analisar Últimas 5
        </button>
      </div>

      {/* Mensagem de status */}
      {message && (
        <p className="text-sm text-gray-400 animate-fadeIn text-right">
          {message}
        </p>
      )}
    </header>
  );
}
