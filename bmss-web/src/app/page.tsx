// app/page.tsx - VERSÃO CORRIGIDA
"use client";

import { useAuth } from "@/lib/useAuth";
import HomeClient from "@/componentes/home/home-client";
import { AuthStateMessage } from "@/componentes/auth/AuthStateMessage";

export default function Home() {
  const { loading, authStatus } = useAuth();

  // ✅ Mostra loading durante verificação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-gray-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // ✅ Retorna null enquanto redireciona
  if (authStatus === "expired") return <AuthStateMessage state="expired" />;
  if (authStatus === "unauthenticated") return <AuthStateMessage state="unauthenticated" />;

  // ✅ Só renderiza HomeClient se usuário estiver autenticado
  return <HomeClient />;
}