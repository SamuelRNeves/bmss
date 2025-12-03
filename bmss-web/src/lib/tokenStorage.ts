import { AUTH_TOKEN_CHANGED_EVENT } from "./authEvents";

const AUTH_COOKIE_NAME = "bmss_auth_token";
const REFRESH_COOKIE_NAME = "bmss_refresh_token";
export const AUTH_TOKEN_STORAGE_KEY = "bmss:auth:access-token";
export const REFRESH_TOKEN_STORAGE_KEY = "bmss:auth:refresh-token";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

const isBrowser = () => typeof window !== "undefined";

type CookieOptions = {
  maxAgeSeconds?: number;
};

const setCookie = (name: string, value: string, options: CookieOptions = {}) => {
  if (!isBrowser()) return;

  const encoded = encodeURIComponent(value);
  const parts = [
    `${name}=${encoded}`,
    "path=/",
    "SameSite=Strict",
  ];

  if (options.maxAgeSeconds && Number.isFinite(options.maxAgeSeconds)) {
    parts.push(`max-age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
  }

  if (window.location.protocol === "https:") {
    parts.push("Secure");
  }

  document.cookie = parts.join("; ");
};

const deleteCookie = (name: string) => {
  setCookie(name, "", { maxAgeSeconds: 0 });
};

const readCookie = (name: string): string | null => {
  if (!isBrowser()) return null;

  const cookies = document.cookie ? document.cookie.split(";") : [];
  const prefix = `${name}=`;

  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return null;
};

export const decodeJwtExpiration = (token: string | null | undefined): number | null => {
  if (!token) return null;

  const [, payloadBase64] = token.split(".");
  if (!payloadBase64) return null;

  try {
    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch (error) {
    console.warn("Não foi possível decodificar o token JWT:", error);
    return null;
  }
};

export const getStoredAccessToken = (): string | null => {
  if (!isBrowser()) return null;
  return readCookie(AUTH_COOKIE_NAME) || localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
};

export const getStoredRefreshToken = (): string | null => {
  if (!isBrowser()) return null;
  return readCookie(REFRESH_COOKIE_NAME) || localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
};

export const persistTokens = (payload: { accessToken?: string | null; refreshToken?: string | null }) => {
  if (!isBrowser()) return;

  const { accessToken, refreshToken } = payload;
  const accessExpiration = decodeJwtExpiration(accessToken ?? undefined);

  if (accessToken) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
    setCookie(AUTH_COOKIE_NAME, accessToken, {
      maxAgeSeconds: accessExpiration ? accessExpiration - Math.floor(Date.now() / 1000) : COOKIE_MAX_AGE_SECONDS,
    });
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    setCookie(REFRESH_COOKIE_NAME, refreshToken, { maxAgeSeconds: COOKIE_MAX_AGE_SECONDS * 2 });
  }

  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
};

export const clearStoredTokens = () => {
  if (!isBrowser()) return;

  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  deleteCookie(AUTH_COOKIE_NAME);
  deleteCookie(REFRESH_COOKIE_NAME);

  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
};
