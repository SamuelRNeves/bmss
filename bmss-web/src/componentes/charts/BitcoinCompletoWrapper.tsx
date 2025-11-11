// componentes/charts/BitcoinCompletoWrapper.tsx
"use client";

import { Suspense, lazy } from "react";

const BitcoinHistoricoCompleto = lazy(() => import("./BitcoinHistoricoCompleto"));

export default function BitcoinCompletoWrapper() {
  return (
    <Suspense
      fallback={
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="h-96 bg-neutral-800/50 rounded-xl animate-pulse" />
          <p className="text-center text-gray-400 mt-4">Carregando história completa...</p>
        </div>
      }
    >
      <BitcoinHistoricoCompleto />
    </Suspense>
  );
}