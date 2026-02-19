import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["*.ngrok-free.dev"],
    },
  },
};

export default nextConfig;
