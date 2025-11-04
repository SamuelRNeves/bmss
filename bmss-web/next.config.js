/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', '*.railway.app', '*.vercel.app'],
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  trailingSlash: false,
  poweredByHeader: false,
}

module.exports = nextConfig