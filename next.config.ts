import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/daily", destination: "/api/daily-fast" }];
  },
};

export default nextConfig;
