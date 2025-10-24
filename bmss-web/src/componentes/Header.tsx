import { RefreshCcw, Search } from "lucide-react";
import { getUltimasNoticias, getSentimentos, analisarNoticias } from "../lib/api"; // 👈 importa o novo endpoint
import { useState, useEffect } from "react";
import axios from "axios";

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

  const handleUpdate = () =>
    atualizarDashboard("Atualizando dados...", "✅ Dashboard atualizado com sucesso!");

  // 🚀 Novo: faz o backend realmente chamar o Flask e atualizar sentimentos
  const handleAnalyzeLast5 = async () => {
  try {
    setLoading(true);
    setMessage("Analisando as últimas 5 notícias...");

    await axios.get("http://localhost:8080/api/v1/noticias/analisar?q=bitcoin");

    setMessage("✅ Análise concluída e salva no banco!");
  } catch (error) {
    console.error(error);
    setMessage("❌ Erro ao analisar notícias");
  } finally {
    setLoading(false);
    setTimeout(() => setMessage(""), 5000);
  }
};


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

      {message && (
        <p className="text-sm text-gray-400 animate-fadeIn text-right">
          {message}
        </p>
      )}
    </header>
  );
}
