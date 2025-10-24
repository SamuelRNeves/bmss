"use client";

import { RefreshCcw, Search } from "lucide-react";
import { getUltimasNoticias, getSentimentos } from "../lib/api";
import axios from "axios";
import { useState, useEffect } from "react";

export default function Header() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔹 Atualização genérica (sentimentos + últimas notícias)
  const atualizarDashboard = async (mensagemInicio: string, mensagemSucesso: string) => {
    try {
      setLoading(true);
      setMessage(mensagemInicio);

      // Atualiza KPIs e lista de notícias
      await Promise.all([getSentimentos(), getUltimasNoticias()]);

      setMessage(mensagemSucesso);
    } catch (error) {
      console.error("❌ Erro ao atualizar dashboard:", error);
      setMessage("❌ Falha ao atualizar o dashboard");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // 🔹 Botão "Atualizar Lista" — apenas busca dados já analisados do banco
  const handleUpdate = () =>
    atualizarDashboard("Atualizando dados...", "✅ Dashboard atualizado com sucesso!");

  // 🔹 Botão "Analisar Últimas 5" — força o backend a buscar, analisar via Flask e salvar
  const handleAnalyzeLast5 = async () => {
    try {
      setLoading(true);
      setMessage("🧠 Analisando as últimas 5 notícias...");

      // Envia a requisição POST (corrige o erro 405)
      await axios.post("http://localhost:8080/api/v1/noticias/analisar", null, {
        params: { q: "bitcoin", limit: 5 },
      });

      setMessage("✅ Análise concluída e salva no banco!");

      // Busca novamente para atualizar a interface
      await atualizarDashboard("🔄 Atualizando lista com novos resultados...", "✅ Lista atualizada!");
    } catch (error) {
      console.error("❌ Erro ao analisar notícias:", error);
      setMessage("❌ Erro ao analisar notícias");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 6000);
    }
  };

  // 🔹 Atualização automática a cada 60 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      atualizarDashboard("⏱ Atualização automática...", "✅ Dashboard sincronizado!");
    }, 60000);
    return () => clearInterval(intervalo);
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
          {loading ? "Analisando..." : "Analisar Últimas 5"}
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
