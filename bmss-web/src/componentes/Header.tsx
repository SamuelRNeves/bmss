"use client";

import { RefreshCcw, Search } from "lucide-react";
import { getUltimasNoticias, getSentimentos } from "../lib/api";
import { useState, useEffect } from "react";

export default function Header() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const atualizarDashboard = async (mensagemInicio: string, mensagemSucesso: string) => {
    try {
      setLoading(true);
      setMessage(mensagemInicio);

      await Promise.all([getSentimentos(), getUltimasNoticias()]);

      setMessage(mensagemSucesso);
    } catch (error) {
      console.error(error);
      setMessage("❌ Falha ao atualizar o dashboard");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

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
  }, []);

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
