const DEFAULT_REMOTE_BASE = "https://bmss-backend.onrender.com/api/v1";
const LOCAL_REMOTE_BASE = "http://localhost:8080/api/v1";

const ensureUrl = (candidate) => {
  if (!candidate || typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^(https?:)?\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  try {
    return new URL(withProtocol);
  } catch (error) {
    console.warn(
      "next.config.js: Ignorando domínio de imagem inválido:",
      candidate,
      error instanceof Error ? error.message : error
    );
    return null;
  }
};

const seenPatterns = new Set();
const remotePatterns = [];

const addRemotePattern = (candidate) => {
  const url = ensureUrl(candidate);
  if (!url) {
    return;
  }

  const signature = `${url.protocol}//${url.hostname}:${url.port || ""}`;
  if (seenPatterns.has(signature)) {
    return;
  }

  seenPatterns.add(signature);

  remotePatterns.push({
    protocol: url.protocol.replace(/:$/, ""),
    hostname: url.hostname,
    ...(url.port ? { port: url.port } : {}),
    pathname: "/**",
  });
};

[
  process.env.NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL,
  process.env.NEXT_PUBLIC_API_BASE_URL,
  DEFAULT_REMOTE_BASE,
  LOCAL_REMOTE_BASE,
].forEach(addRemotePattern);

if (remotePatterns.length === 0) {
  remotePatterns.push({
    protocol: "https",
    hostname: "bmss-backend.onrender.com",
    pathname: "/**",
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns,
  },
};

module.exports = nextConfig;
