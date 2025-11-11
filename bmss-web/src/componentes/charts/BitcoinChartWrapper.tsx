// componentes/charts/BitcoinChartWrapper.tsx
"use client";

import { Suspense, lazy } from "react";

const BitcoinHistoricoChart = lazy(() => import("./BitcoinHistoricoChart"));

export default function BitcoinChartWrapper() {
  return (
    <Suspense
      fallback={
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              Histórico do Bitcoin
            </h3>
            <div className="animate-spin">
              <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full" />
            </div>
          </div>
          <div className="h-80 bg-neutral-800/50 rounded-xl animate-pulse" />
        </div>
      }
    >
      <BitcoinHistoricoChart />
    </Suspense>
  );
}