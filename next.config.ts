import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Fix Turbopack root detection (ignore stray lockfiles in parent dirs)
  experimental: {
    turbo: {
      root: '.',
    },
  },
};

export default nextConfig;
