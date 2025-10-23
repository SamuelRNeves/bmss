"use client";

import { RefreshCcw, Search } from "lucide-react";
import {
  NoticiasResponse,
  getUltimasNoticias,
  getSentimentos,
} from "../lib/api";
import { useState, useEffect, useCallback } from "react";

export default function Header() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const resolveMensagemFinal = useCallback(
    (noticias: NoticiasResponse | null, fallback: string) => {
      if (!noticias) return fallback;

      if (noticias.usingFallback) {
        if (noticias.fallbackSource === "database") {
          return "⚠️ Exibindo notícias em cache enquanto as fontes externas se recuperam.";
      }
      return "⚠️ Todas as fontes externas falharam. Mostrando aviso temporário.";
    }

    if (noticias.errors?.length) {
      return `⚠️ ${noticias.errors[0]}`;
    }

    if (noticias.partial) {
      return "⚠️ Nem todas as fontes responderam; exibindo resultados parciais.";
    }

    if (noticias.warnings?.length) {
      return `⚠️ ${noticias.warnings[0]}`;
    }

      if (noticias.fromCache) {
        return "ℹ️ Dados recentes servidos do cache.";
      }

      return fallback;
    },
    []
  );

  const atualizarDashboard = useCallback(
    async (mensagemInicio: string, mensagemSucesso: string) => {
      try {
        setLoading(true);
        setMessage(mensagemInicio);

        const [, noticias] = await Promise.all([
          getSentimentos(),
          getUltimasNoticias(),
        ]);

        setMessage(resolveMensagemFinal(noticias, mensagemSucesso));
      } catch (error) {
        console.error(error);
        setMessage("❌ Falha ao atualizar o dashboard");
      } finally {
        setLoading(false);
        setTimeout(() => setMessage(""), 5000);
      }
    },
    [resolveMensagemFinal]
  );

  // 🔄 Atualização manual
  const handleUpdate = () =>
    atualizarDashboard("Atualizando dados...", "✅ Dashboard atualizado com sucesso!");

  const handleAnalyzeLast5 = () =>
    atualizarDashboard("Analisando as últimas 5 notícias...", "✅ Análise concluída com sucesso!");

  // ⏱ Atualização automática a cada 60 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      atualizarDashboard("⏱ Atualização automática...", "✅ Dashboard sincronizado!");
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
