"use client";

import { useEffect, useState } from "react";

interface UserData {
  name: string;
  email: string;
  investorProfile: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega o usuário automaticamente pelo token JWT
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1"}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Token inválido");
        const data = await res.json();
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem("jwtToken");
        setUser(null);
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
