// app/page.tsx - VERSÃO CORRIGIDA
"use client";

import HomeClient from "@/componentes/home/home-client";

// Renderiza o dashboard e deixa o cliente decidir o redirecionamento:
// usuários autenticados visualizam o painel e visitantes são enviados para o
// login assim que a checagem de sessão é concluída.
export default function Home() {
  return <HomeClient />;
}