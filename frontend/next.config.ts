import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: path.join(__dirname) },

  // The /demo/* pages exist so anyone can watch edit-detection catch a source
  // being rewritten between witnessings. That story only holds if validators
  // fetch the CURRENT text — no CDN caching, no stale-while-revalidate.
  async headers() {
    return [
      {
        source: "/demo/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Vercel-CDN-Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
