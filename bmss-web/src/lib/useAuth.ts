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
  profileImageUrl?: string | null;
}

type InvestorProfile = "CONSERVADOR" | "MODERADO" | "AGRESSIVO";

type UserPatch = Partial<
  Pick<UserData, "investorProfile" | "notificationPreference" | "profileImageUrl">
>;

const PROFILE_IMAGE_MAX_CHARS = 3_600_000;

const normalizeProfileImageValue = (
  value: string | null | undefined
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\s+/g, "");
};

const enforceProfileImageLimit = (
  value: string | null | undefined
): string | null | undefined => {
  const normalized = normalizeProfileImageValue(value);
  if (typeof normalized === "string" && normalized.length > PROFILE_IMAGE_MAX_CHARS) {
    throw new Error(
      "A imagem do perfil ficou muito grande após a otimização. Escolha um arquivo menor (até 3 MB em base64)."
    );
  }
  return normalized;
};

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

  const persistUserUpdate = useCallback(
    async (patch: UserPatch): Promise<UserPatch> => {
      if (!patch || Object.keys(patch).length === 0) {
        return {};
      }

      if (!user) {
        throw new Error("Informações do usuário ainda não foram carregadas");
      }

      const applyLocalUpdate = (delta: UserPatch) => {
        const sanitized: UserPatch = {};

        if (delta.investorProfile !== undefined) {
          sanitized.investorProfile = delta.investorProfile;
        }

        if (delta.notificationPreference !== undefined) {
          sanitized.notificationPreference = delta.notificationPreference;
        }

        if (delta.profileImageUrl !== undefined) {
          const normalized = normalizeProfileImageValue(delta.profileImageUrl);
          sanitized.profileImageUrl = normalized ?? null;
        }

        setUser((prev) => {
          if (!prev) {
            return prev;
          }

          const next = { ...prev };

          if (sanitized.investorProfile !== undefined) {
            next.investorProfile = sanitized.investorProfile;
          }

          if (sanitized.notificationPreference !== undefined) {
            next.notificationPreference = sanitized.notificationPreference;
          }

          if (sanitized.profileImageUrl !== undefined) {
            next.profileImageUrl = sanitized.profileImageUrl ?? null;
          }

          return next;
        });

        if (Object.keys(sanitized).length > 0) {
          window.dispatchEvent(
            new CustomEvent("bmss:profile-updated", {
              detail: sanitized,
            })
          );
        }

        return sanitized;
      };

      if (!user.id) {
        return applyLocalUpdate(patch);
      }

      const token = localStorage.getItem("jwtToken");
      if (!token) {
        throw new Error("Usuário não autenticado");
      }

      const requestPayload: Record<string, unknown> = {};

      if (patch.investorProfile !== undefined) {
        requestPayload.investorProfile = patch.investorProfile;
      }

      if (patch.notificationPreference !== undefined) {
        requestPayload.notificationPreference = patch.notificationPreference;
      }

      if (patch.profileImageUrl !== undefined) {
        const normalized = enforceProfileImageLimit(patch.profileImageUrl);
        requestPayload.profileImageUrl = normalized ?? "";
      }

      const response = await fetch(`${apiBase}/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Não foi possível atualizar os dados do usuário.");
      }

      let payload: Record<string, unknown> | null = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      const normalized: UserPatch = {};

      if (
        patch.investorProfile !== undefined ||
        (payload && Object.prototype.hasOwnProperty.call(payload, "investorProfile"))
      ) {
        normalized.investorProfile =
          (payload?.investorProfile as string | undefined) ?? patch.investorProfile;
      }

      if (
        patch.notificationPreference !== undefined ||
        (payload && Object.prototype.hasOwnProperty.call(payload, "notificationPreference"))
      ) {
        normalized.notificationPreference =
          (payload?.notificationPreference as string | undefined) ?? patch.notificationPreference;
      }

      const responseIncludesProfileImage = Boolean(
        payload && Object.prototype.hasOwnProperty.call(payload, "profileImageUrl")
      );

      if (patch.profileImageUrl !== undefined || responseIncludesProfileImage) {
        const rawProfileImage = responseIncludesProfileImage
          ? (payload?.profileImageUrl as string | null | undefined)
          : patch.profileImageUrl;

        const normalizedProfile = normalizeProfileImageValue(rawProfileImage);
        if (normalizedProfile !== undefined) {
          normalized.profileImageUrl = normalizedProfile ?? null;
        }
      }

      return applyLocalUpdate(normalized);
    },
    [apiBase, user]
  );

  const updateInvestorProfile = useCallback(
    async (nextProfile: InvestorProfile): Promise<void> => {
      if (!nextProfile) {
        return;
      }

      try {
        await persistUserUpdate({ investorProfile: nextProfile });
      } catch (error) {
        console.error("Erro ao atualizar perfil do investidor:", error);
        throw error;
      }
    },
    [persistUserUpdate]
  );

  const updateUserSettings = useCallback(
    async (patch: UserPatch): Promise<UserPatch> => {
      try {
        return await persistUserUpdate(patch);
      } catch (error) {
        console.error("Erro ao atualizar dados do usuário:", error);
        throw error;
      }
    },
    [persistUserUpdate]
  );

  const logout = () => {
    localStorage.removeItem("jwtToken");
    setUser(null);
    window.location.href = "/login";
  };

  return { user, loading, logout, updateInvestorProfile, updateUserSettings };
}