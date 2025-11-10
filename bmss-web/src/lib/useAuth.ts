// useAuth.ts
"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api"; // use o axios configurado

interface UserData {
  id?: number;
  name: string;
  email: string;
  investorProfile: string;
  notificationPreference?: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const token = localStorage.getItem("jwtToken");
  if (!token) {
    setLoading(false);
    return;
  }

  api
    .get("/auth/me")
    .then((res) => {
      setUser(res.data);
    })
    .catch((error) => {
      // Só remove o token se for 401 (token expirado/inválido)
      if (error.response?.status === 401) {
        console.warn("🔒 Token expirado ou inválido, removendo...");
        localStorage.removeItem("jwtToken");
        setUser(null);
      } else {
        console.error("⚠️ Erro inesperado em /auth/me:", error);
      }
    })
    .finally(() => setLoading(false));
}, []);


  const logout = () => {
    localStorage.removeItem("jwtToken");
    setUser(null);
    window.location.href = "/login";
  };

  return { user, loading, logout };
}
