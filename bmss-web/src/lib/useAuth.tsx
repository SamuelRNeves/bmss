// useAuth.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api, { API_BASE_URL } from "@/lib/api";

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

const PROFILE_IMAGE_MAX_BYTES = 2_500_000;
const DATA_URL_PREFIX = /^data:image\/[-+\w.]+;base64,/i;

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

const estimateBase64Size = (value: string): number => {
  const payload = value.replace(DATA_URL_PREFIX, "");
  return Math.ceil((payload.length * 3) / 4);
};

const enforceProfileImageLimit = (
  value: string | null | undefined
): string | null | undefined => {
  const normalized = normalizeProfileImageValue(value);
  if (typeof normalized !== "string") {
    return normalized;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("/")) {
    return normalized;
  }

  const estimatedBytes = estimateBase64Size(normalized);
  if (estimatedBytes > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error("A imagem do perfil excede 2.5 MB. Escolha um arquivo menor.");
  }

  return normalized;
};

const resolvePublicBase = (apiBase: string): string => {
  const sanitized = apiBase.replace(/\/+$/, "");
  return sanitized.replace(/\/api\/v1$/i, "");
};

const resolveProfileImageSource = (
  value: string | null | undefined,
  apiBase: string
): string | null | undefined => {
  const normalized = normalizeProfileImageValue(value);
  if (normalized === undefined) {
    return undefined;
  }

  if (normalized === null) {
    return null;
  }

  if (normalized.startsWith("data:image")) {
    return normalized;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  const publicBase = resolvePublicBase(apiBase);
  const suffix = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${publicBase}${suffix}`;
};

const resolveApiBase = (): string => {
  return API_BASE_URL.replace(/\/+$/, "");
};

export const INVESTOR_PROFILE_STORAGE_KEY = "bmss:last-investor-profile";
const USER_CACHE_STORAGE_KEY = "bmss:cached-user:v1";

type CachedUserPayload = {
  id?: number;
  name?: string;
  email?: string;
  investorProfile?: string;
  notificationPreference?: string;
  profileImageUrl?: string | null;
};

const loadCachedUser = (): UserData | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_STORAGE_KEY);
    if (!raw) {
      const storedProfile = window.localStorage.getItem(INVESTOR_PROFILE_STORAGE_KEY);
      if (!storedProfile) {
        return null;
      }
      return {
        name: "",
        email: "",
        investorProfile: storedProfile,
        notificationPreference: "resumo_diario",
        profileImageUrl: null,
      };
    }

    const parsed = JSON.parse(raw) as CachedUserPayload | null;
    if (!parsed) {
      return null;
    }

    return {
      id: typeof parsed.id === "number" ? parsed.id : undefined,
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      investorProfile:
        typeof parsed.investorProfile === "string" ? parsed.investorProfile : "MODERADO",
      notificationPreference:
        typeof parsed.notificationPreference === "string"
          ? parsed.notificationPreference
          : "resumo_diario",
      profileImageUrl:
        typeof parsed.profileImageUrl === "string" ? parsed.profileImageUrl : null,
    };
  } catch {
    return null;
  }
};

const persistCachedUser = (value: UserData | null) => {
  if (typeof window === "undefined") return;
  if (!value) {
    window.localStorage.removeItem(USER_CACHE_STORAGE_KEY);
    window.localStorage.removeItem(INVESTOR_PROFILE_STORAGE_KEY);
    return;
  }

  const payload: CachedUserPayload = {
    id: value.id,
    name: value.name,
    email: value.email,
    investorProfile: value.investorProfile,
    notificationPreference: value.notificationPreference,
    profileImageUrl: value.profileImageUrl ?? null,
  };

  try {
    window.localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(payload));
    if (value.investorProfile) {
      window.localStorage.setItem(INVESTOR_PROFILE_STORAGE_KEY, value.investorProfile);
    }
  } catch (error) {
    console.warn("Não foi possível salvar o usuário em cache:", error);
  }
};

interface AuthContextValue {
  user: UserData | null;
  loading: boolean;
  logout: () => void;
  updateInvestorProfile: (nextProfile: InvestorProfile) => Promise<void>;
  updateUserSettings: (patch: UserPatch) => Promise<UserPatch>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useProvideAuth(): AuthContextValue {
  const [user, setUserState] = useState<UserData | null>(() => loadCachedUser());
  const [loading, setLoading] = useState(true);

  const apiBase = useMemo(() => resolveApiBase(), []);

  const setUser = useCallback(
    (updater: UserData | null | ((prev: UserData | null) => UserData | null)) => {
      setUserState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (value: UserData | null) => UserData | null)(prev)
            : updater;
        persistCachedUser(next ?? null);
        return next ?? null;
      });
    },
    []
  );

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("jwtToken") : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    api
      .get("/auth/me")
      .then((res) => {
        if (!isMounted) return;
        const payload = res.data as Partial<UserData> | undefined;
        if (payload) {
          const resolvedProfile = resolveProfileImageSource(payload.profileImageUrl, apiBase);
          const normalizedUser: UserData = {
            id: payload.id as number | undefined,
            name: (payload.name as string) ?? "",
            email: (payload.email as string) ?? "",
            investorProfile: (payload.investorProfile as string) ?? "MODERADO",
            notificationPreference:
              (payload.notificationPreference as string | undefined) ?? "resumo_diario",
            profileImageUrl: resolvedProfile ?? null,
          };
          setUser(normalizedUser);
        } else {
          setUser(null);
        }
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          console.warn("🔒 Token expirado ou inválido, removendo...");
          if (typeof window !== "undefined") {
            localStorage.removeItem("jwtToken");
          }
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
  }, [apiBase, setUser]);

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
  }, [setUser]);

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
          const resolved = resolveProfileImageSource(delta.profileImageUrl, apiBase);
          sanitized.profileImageUrl = resolved ?? null;
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

      const token = typeof window !== "undefined" ? localStorage.getItem("jwtToken") : null;
      if (!token) {
        throw new Error("Usuário não autenticado");
      }

      const requestPayload: Record<string, unknown> = {};

      if (patch.investorProfile !== undefined) {
        requestPayload.investorProfile = patch.investorProfile;
      }

      const shouldBootstrapPreference =
        patch.notificationPreference === undefined &&
        (patch.investorProfile !== undefined || patch.profileImageUrl !== undefined) &&
        (user.notificationPreference === null || user.notificationPreference === undefined);

      if (patch.notificationPreference !== undefined) {
        requestPayload.notificationPreference = patch.notificationPreference;
      } else if (shouldBootstrapPreference) {
        requestPayload.notificationPreference = "resumo_diario";
      }

      if (patch.profileImageUrl !== undefined) {
        const normalized = enforceProfileImageLimit(patch.profileImageUrl);
        requestPayload.profileImage = normalized ?? "";
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

      if (payload && typeof payload.token === "string" && payload.token.trim()) {
        localStorage.setItem("jwtToken", payload.token.trim());
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
        (payload && Object.prototype.hasOwnProperty.call(payload, "notificationPreference")) ||
        shouldBootstrapPreference
      ) {
        normalized.notificationPreference =
          (payload?.notificationPreference as string | undefined) ??
          patch.notificationPreference ??
          (shouldBootstrapPreference ? "resumo_diario" : undefined);
      }

      const responseIncludesProfileImage = Boolean(
        payload && Object.prototype.hasOwnProperty.call(payload, "profileImageUrl")
      );

      if (patch.profileImageUrl !== undefined || responseIncludesProfileImage) {
        const rawProfileImage = responseIncludesProfileImage
          ? (payload?.profileImageUrl as string | null | undefined)
          : patch.profileImageUrl;

        const resolvedProfile = resolveProfileImageSource(rawProfileImage ?? undefined, apiBase);
        if (resolvedProfile !== undefined) {
          normalized.profileImageUrl = resolvedProfile ?? null;
        }
      }

      return applyLocalUpdate(normalized);
    },
    [apiBase, setUser, user]
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

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("jwtToken");
    }
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, [setUser]);

  return { user, loading, logout, updateInvestorProfile, updateUserSettings };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useProvideAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
