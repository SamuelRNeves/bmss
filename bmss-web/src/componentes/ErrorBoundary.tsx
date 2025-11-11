// component/ErrorBoundary.tsx → VERSÃO CORRETA E SEGURA (2025)
"use client";

import React, { ReactNode, useEffect } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  useEffect(() => {
    const handleErrors = (event: ErrorEvent) => {
      event.preventDefault();
      setHasError(true);
      setError(event.error);
      console.error("ErrorBoundary capturou:", event.error);
    };

    window.addEventListener("error", handleErrors);
    return () => window.removeEventListener("error", handleErrors);
  }, []);

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-8">
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold text-red-500 mb-4">
            Ops! Ocorreu um erro
          </h2>
          <p className="text-gray-400 mb-6">
            Não conseguimos carregar o dashboard no momento.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition font-semibold"
          >
            Recarregar Página
          </button>
          {error && (
            <details className="mt-8 text-left text-sm text-gray-500">
              <summary className="cursor-pointer hover:text-gray-300">
                Detalhes técnicos
              </summary>
              <pre className="mt-4 p-4 bg-neutral-900 rounded text-xs overflow-auto">
                {error.message}
                {"\n"}
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ErrorBoundary;