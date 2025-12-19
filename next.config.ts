import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Fix Turbopack root detection (ignore stray lockfiles in parent dirs)
  // Next.js expects this under the `turbopack` key (not `experimental`).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...( { turbopack: { root: __dirname } } as any ),
};

export default nextConfig;
