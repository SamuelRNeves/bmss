// componentes/charts/BitcoinChartWrapper.tsx
"use client";

import React, { Suspense } from "react";

const BitcoinHistoricoChart = React.lazy(() => import("./BitcoinHistoricoChart"));

export default function BitcoinChartWrapper() {
  return (
    <Suspense
      fallback={
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="h-96 bg-neutral-800/50 rounded-xl animate-pulse" />
          <p className="text-center text-gray-400 mt-4">Carregando histórico recente...</p>
        </div>
      }
    >
      <BitcoinHistoricoChart />
    </Suspense>
  );
}