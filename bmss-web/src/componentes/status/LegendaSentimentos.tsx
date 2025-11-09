"use client";

import { Smile, Meh, Frown } from "lucide-react";

export default function LegendaSentimentos() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-100 mb-4">
        Legenda de Sentimentos
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {/* Positivo */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition-all">
          <div className="mt-1">
            <Smile size={20} className="text-green-400" />
          </div>
          <div>
            <h3 className="font-medium text-green-400">Positivo</h3>
            <p className="text-gray-300">
              Indica otimismo e confiança no mercado. Geralmente associado a
              boas notícias e tendências de alta no Bitcoin.
            </p>
          </div>
        </div>

        {/* Neutro */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all">
          <div className="mt-1">
            <Meh size={20} className="text-yellow-400" />
          </div>
          <div>
            <h3 className="font-medium text-yellow-400">Neutro</h3>
            <p className="text-gray-300">
              Representa equilíbrio, sem viés emocional relevante. O mercado
              apresenta estabilidade ou indecisão.
            </p>
          </div>
        </div>

        {/* Negativo */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all">
          <div className="mt-1">
            <Frown size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-medium text-red-400">Negativo</h3>
            <p className="text-gray-300">
              Indica medo, pessimismo ou desconfiança. Frequentemente
              relacionado a quedas ou incertezas no mercado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
