// useAuth.ts
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

interface UserData {
  id?: number;
  name: string;
  email: string;
  investorProfile: string;
  notificationPreference?: string;
}

type InvestorProfile = "CONSERVADOR" | "MODERADO" | "AGRESSIVO";

const resolveApiBase = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured && configured.length > 0) {
    return configured.replace(/\/+$/, "");
  }
  return "https://bmss-backend.onrender.com";
};

export function useAuth() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const apiBase = useMemo(() => resolveApiBase(), []);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    api
      .get("/auth/me")
      .then((res) => {
        if (!isMounted) return;
        setUser(res.data);
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          console.warn("🔒 Token expirado ou inválido, removendo...");
          localStorage.removeItem("jwtToken");
          if (!isMounted) return;
          setUser(null);
        } else {
          console.error("⚠️ Erro inesperado em /auth/me:", error);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handler: EventListener = (event) => {
      const detail = (event as CustomEvent<Partial<UserData>>).detail;
      if (!detail) {
        return;
      }

      setUser((prev) => {
        if (!prev) {
          return prev;
        }
        return { ...prev, ...detail };
      });
    };

    window.addEventListener("bmss:profile-updated", handler);
    return () => {
      window.removeEventListener("bmss:profile-updated", handler);
    };
  }, []);

  const updateInvestorProfile = useCallback(
    async (nextProfile: InvestorProfile): Promise<void> => {
      if (!nextProfile) {
        return;
      }

      const token = localStorage.getItem("jwtToken");
      if (!token) {
        throw new Error("Usuário não autenticado");
      }

      if (!user) {
        throw new Error("Informações do usuário ainda não foram carregadas");
      }

      try {
        if (!user.id) {
          setUser((prev) => (prev ? { ...prev, investorProfile: nextProfile } : prev));
          window.dispatchEvent(
            new CustomEvent("bmss:profile-updated", {
              detail: { investorProfile: nextProfile },
            })
          );
          return;
        }

        const response = await fetch(`${apiBase}/users/${user.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            investorProfile: nextProfile,
            notificationPreference: user.notificationPreference,
          }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(
            message || "Erro ao atualizar perfil de investidor. Tente novamente."
          );
        }

        let investorProfile: string | undefined;
        let notificationPreference: string | undefined;
        try {
          const payload = await response.json();
          investorProfile = payload?.investorProfile ?? undefined;
          notificationPreference = payload?.notificationPreference ?? undefined;
        } catch (error) {
          investorProfile = undefined;
          notificationPreference = undefined;
        }

        const resolvedProfile = (investorProfile || nextProfile) as InvestorProfile;

        setUser((prev) =>
          prev
            ? {
                ...prev,
                investorProfile: resolvedProfile,
                notificationPreference:
                  notificationPreference ?? prev.notificationPreference,
              }
            : prev
        );

        window.dispatchEvent(
          new CustomEvent("bmss:profile-updated", {
            detail: {
              investorProfile: resolvedProfile,
              notificationPreference: notificationPreference ?? user.notificationPreference,
            },
          })
        );
      } catch (error) {
        console.error("Erro ao atualizar perfil do investidor:", error);
        throw error;
      }
    },
    [apiBase, user]
  );

  const logout = () => {
    localStorage.removeItem("jwtToken");
    setUser(null);
    window.location.href = "/login";
  };

  return { user, loading, logout, updateInvestorProfile };
}