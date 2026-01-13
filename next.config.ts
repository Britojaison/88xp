import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Fix Turbopack root detection (ignore stray lockfiles in parent dirs)
  // Next.js expects this under the `turbopack` key (not `experimental`).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...( { turbopack: { root: __dirname } } as any ),
  
  // Add proper cache headers to prevent excessive client-side caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
