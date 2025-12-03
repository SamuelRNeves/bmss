// app/page.tsx - VERSÃO CORRIGIDA
"use client";

import HomeClient from "@/componentes/home/home-client";

// Renderiza o dashboard diretamente, sem redirecionar usuários não autenticados.
// Isso evita que a página fique presa em um estado de loading quando o backend
// não responde rápido, permitindo que o visitante acesse o conteúdo e os links
// de login/cadastro imediatamente.
export default function Home() {
  return <HomeClient />;
}