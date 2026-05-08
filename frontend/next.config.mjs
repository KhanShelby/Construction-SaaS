// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // proxy API calls in dev (ไม่ต้องแก้ CORS ใน FastAPI)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/:path*`,
      },
    ]
  },
}

export default nextConfig
