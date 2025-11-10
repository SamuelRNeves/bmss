"use client";

import { useEffect, useState } from "react";

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

  // ✅ Carrega o usuário automaticamente com o token JWT correto
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "https://bmss-backend.onrender.com/api/v1"}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Token inválido ou expirado");
        const data = await res.json();
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/login";
  };

  return { user, loading, logout };
}
