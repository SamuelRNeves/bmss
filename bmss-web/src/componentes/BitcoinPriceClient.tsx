// componentes/utils/BitcoinPriceClient.tsx
"use client";

import { Suspense, lazy } from "react";

// Lazy load para garantir que NUNCA seja SSR
const BitcoinPriceContent = lazy(() => import("./utils/BitcoinPriceContent"));
export default function BitcoinPriceClient() {
  return (
    <Suspense
      fallback={
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/20 rounded-xl p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-yellow-400/20 rounded w-1/4 mb-2"></div>
            <div className="h-8 bg-yellow-400/20 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-yellow-400/20 rounded w-1/3"></div>
          </div>
        </div>
      }
    >
      <BitcoinPriceContent />
    </Suspense>
  );
}