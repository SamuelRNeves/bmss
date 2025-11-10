// app/page.tsx - VERSÃO DEBUG
"use client";
import { useEffect, useState } from "react";
import AuthDebug from "@/componentes/AuthDebug";

let pageRenderCount = 0;

export default function HomePage() {
  const [simpleUser, setSimpleUser] = useState<any>(null);
  const [simpleLoading, setSimpleLoading] = useState(true);

  pageRenderCount++;
  console.log(`🏠 HomePage renderizado ${pageRenderCount} vezes`);

  useEffect(() => {
    console.log("🏠 HomePage useEffect executando");
    
    const token = localStorage.getItem("jwtToken");
    if (token) {
      // Simulação simples - sem useAuth
      setTimeout(() => {
        console.log("🏠 HomePage: Usuário definido");
        setSimpleUser({ name: "Usuário Simples", email: "simple@email.com" });
        setSimpleLoading(false);
      }, 500);
    } else {
      setSimpleLoading(false);
    }
  }, []); // ✅ Array vazio - executa apenas uma vez

  // ✅ Renderização simples sem lógica complexa
  return (
    <div>
      <h1>Página Principal - Debug</h1>
      
      {/* Status da página */}
      <div style={{ margin: '10px 0', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Status da Página:</h3>
        <p>Renderizações: {pageRenderCount}</p>
        <p>Loading: {simpleLoading ? 'Sim' : 'Não'}</p>
        <p>Usuário: {simpleUser ? simpleUser.name : 'Nenhum'}</p>
      </div>

      {/* Componente Debug */}
      <AuthDebug />

      {/* Conteúdo normal da página */}
      <div style={{ marginTop: '20px' }}>
        <h2>Conteúdo da Página</h2>
        <p>Bem-vindo ao sistema!</p>
      </div>
    </div>
  );
}