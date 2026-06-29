import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/files/public/:path*",
      },
    ];
  },
};

export default nextConfig;
