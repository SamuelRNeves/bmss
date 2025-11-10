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
    const token = localStorage.getItem("jwtToken"); // <- padronizado
    if (!token) {
      setLoading(false);
      return;
    }

    api.get("/auth/me") // <- herda baseURL e Authorization
      .then((res) => setUser(res.data))
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
