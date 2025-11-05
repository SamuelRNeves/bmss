import { RefreshCcw, Search, UserPlus } from "lucide-react";
import { getFeed, getSentimentos } from "../lib/api";
import { useState, useEffect } from "react";
import axios from "axios";

export default function Header() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? "http://localhost:8080/api/v1" : undefined);

  // 🔹 Atualiza dashboard normalmente
  const atualizarDashboard = async (msgInicio: string, msgSucesso: string) => {
    try {
      setLoading(true);
      setMessage(msgInicio);

      await Promise.all([getSentimentos(), getFeed("news", 30, "bitcoin")]);
      setMessage(msgSucesso);
    } catch (error) {
      console.error("Erro ao atualizar dashboard:", error);
      setMessage("❌ Falha ao atualizar o dashboard");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  // 🔹 Chama o backend (que por sua vez chama o Flask)
  const handleAnalyzeLast5 = async () => {
    try {
      setLoading(true);
      setMessage("Analisando as últimas 5 notícias...");

      // ⚠️ importante: POST, não GET
      if (!API_BASE_URL) {
        throw new Error("API base URL não configurada");
      }

      const response = await axios.post(
        `${API_BASE_URL}/noticias/analisar`,
        null,
        { params: { q: "bitcoin", limit: 5 } }
      );

      console.log("🔍 Resposta do backend:", response.data);

      await atualizarDashboard(
        "🔄 Atualizando dashboard...",
        "✅ Análise concluída com sucesso!"
      );
    } catch (error) {
      console.error("❌ Erro ao acionar análise:", error);
      setMessage("❌ Erro ao analisar notícias");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Atualização automática a cada 60s
  useEffect(() => {
    const intervalo = setInterval(() => {
      atualizarDashboard("⏱ Atualização automática...", "✅ Dashboard sincronizado!");
    }, 6000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard de Sentimento</h1>
        <p className="text-sm text-gray-400">Análise em tempo real do mercado Bitcoin</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => atualizarDashboard("Atualizando dados...", "✅ Dashboard atualizado!")}
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

        <a
          href="/cadastrar"
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium px-4 py-2 rounded-lg transition"
        >
          <UserPlus size={18} />
          Cadastrar
        </a>
      </div>

      {message && (
        <p className="text-sm text-gray-400 animate-fadeIn text-right">{message}</p>
      )}
    </header>
  );
}