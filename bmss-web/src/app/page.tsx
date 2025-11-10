// app/page.tsx - VERSÃO FINAL
"use client";
import { useAuth } from "@/lib/useAuth";

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  // ✅ Renderização condicional SIMPLES
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Carregando...</h1>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Bem-vindo ao Bitcoin Sentiment Analysis</h1>
          <p className="text-gray-400 mb-6">Faça login para acessar o dashboard</p>
          <a 
            href="/login" 
            className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition"
          >
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  // ✅ Conteúdo normal APÓS verificação
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span>Olá, {user.name}</span>
            <button 
              onClick={logout}
              className="bg-red-500 hover:bg-red-400 px-4 py-2 rounded-lg transition"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Seus componentes de dashboard aqui */}
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
            <h2 className="text-xl font-semibold mb-4">Resumo do Sentimento</h2>
            <p className="text-gray-400">Conteúdo do dashboard...</p>
          </div>
          
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
            <h2 className="text-xl font-semibold mb-4">Notícias Recentes</h2>
            <p className="text-gray-400">Conteúdo do dashboard...</p>
          </div>
          
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
            <h2 className="text-xl font-semibold mb-4">Seu Perfil: {user.investorProfile}</h2>
            <p className="text-gray-400">Conteúdo personalizado...</p>
          </div>
        </div>
      </div>
    </div>
  );
}