"use client";

import { Upload, RefreshCcw, Search } from "lucide-react";

export default function Header() {
  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
      {/* Título */}
      <h1 className="text-2xl font-bold text-gray-100">Dashboard de Sentimento</h1>

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-3">
        <button className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium px-4 py-2 rounded-lg transition">
          <Upload size={18} />
          Importar Notícias
        </button>

        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition">
          <RefreshCcw size={18} />
          Atualizar Lista
        </button>

        <button className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-lg transition">
          <Search size={18} />
          Analisar Últimas 5
        </button>
      </div>
    </header>
  );
}
