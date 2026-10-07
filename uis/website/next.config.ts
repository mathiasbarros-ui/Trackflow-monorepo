import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";
    return [{ source: "/backend/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
