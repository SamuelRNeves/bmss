// app/page.tsx - VERSÃO CORRIGIDA
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import HomeClient from "@/componentes/home/home-client";

export default function Home() {
  const { loading, authStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (authStatus === "expired" || authStatus === "unauthenticated") {
      const redirectTarget = authStatus === "expired" ? "/login?expired=1" : "/login";
      router.replace(redirectTarget);
    }
  }, [authStatus, loading, router]);

  // ✅ Mostra loading durante verificação
  if (loading || authStatus === "expired" || authStatus === "unauthenticated") {
    const message = loading ? "Verificando autenticação..." : "Redirecionando para o login...";
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-gray-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p>{message}</p>
        </div>
      </div>
    );
  }

  // ✅ Só renderiza HomeClient se usuário estiver autenticado
  return <HomeClient />;
}