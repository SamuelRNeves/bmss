"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("🚨 Erro global capturado:", error);
  }, [error]);

  return (
    <html>
      <body className="bg-black text-red-500 p-10">
        <h1 className="text-2xl font-bold">💥 Erro no aplicativo</h1>
        <p className="mt-4">{error.message}</p>
        <button
          onClick={reset}
          className="mt-6 bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-400 transition"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
