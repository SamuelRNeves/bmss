// component/ErrorBoundary.tsx (ou onde estiver)
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode; // Agora aceita fallback!
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary capturou um erro:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Se você passou um fallback personalizado
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-8">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-red-500 mb-4">
              Ops! Algo deu errado
            </h2>
            <p className="text-gray-400 mb-6">
              Ocorreu um erro inesperado no dashboard.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition"
            >
              Recarregar Página
            </button>
            <details className="mt-6 text-left text-sm text-gray-500">
              <summary className="cursor-pointer">Ver detalhes do erro</summary>
              <pre className="mt-2 p-4 bg-neutral-900 rounded overflow-auto text-xs">
                {this.state.error?.message}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}