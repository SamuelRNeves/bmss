// app/page.tsx - VERSÃO CORRIGIDA
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import HomeClient from "@/componentes/home/home-client";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // ✅ useEffect para redirecionamento - evita loop
  useEffect(() => {
    if (!loading && !user) {
      console.log("🔀 Redirecionando para login...");
      router.push("/login");
    }
  }, [user, loading, router]);

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
  if (!user) {
    return null;
  }

  // ✅ Só renderiza HomeClient se usuário estiver autenticado
  return <HomeClient />;
}