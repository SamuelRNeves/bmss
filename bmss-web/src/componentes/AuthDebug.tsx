// components/AuthDebug.tsx
"use client";
import { useEffect, useState } from "react";
import { getStoredAccessToken } from "@/lib/tokenStorage";

let renderCount = 0;

export default function AuthDebug() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  renderCount++;
  console.log(`🔄 AuthDebug renderizado ${renderCount} vezes`);

  useEffect(() => {
    console.log("🔍 AuthDebug useEffect executando");
    const token = getStoredAccessToken();
    
    if (token) {
      // Simula uma chamada API
      setTimeout(() => {
        setUser({ name: "Usuário Teste", email: "teste@email.com" });
        setLoading(false);
      }, 1000);
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return <div style={{ background: 'yellow', padding: '10px' }}>🔄 Carregando...</div>;
  if (!user) return <div style={{ background: 'orange', padding: '10px' }}>🚫 Não logado</div>;
  
  return <div style={{ background: 'lightgreen', padding: '10px' }}>✅ Logado: {user.name}</div>;
}