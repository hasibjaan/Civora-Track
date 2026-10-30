import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

// Next.js needs inline scripts for hydration, and the dev server needs eval for hot reload.
// Production allows neither beyond what Next itself requires.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Map tiles: OpenStreetMap street maps, and Google Earth Engine satellite imagery.
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://earthengine.googleapis.com",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // The Earth Engine client is a large CommonJS library. Load it from node_modules at run time
  // instead of bundling it.
  serverExternalPackages: ["@google/earthengine"],
  turbopack: {
    // Pin the project root. Otherwise Turbopack may pick a parent folder that also has a
    // lockfile, and then fail to resolve the "@/" import alias.
    root: path.dirname(fileURLToPath(import.meta.url)),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    ignoreIssue: [
      {
        // The photo directory is a fixed server path and every file name is a validated
        // tracking ID, so the whole-project tracing this warning reports is not needed.
        path: "**/src/data/photos.ts",
        title: /Dynamic filesystem access/,
      },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Report data is personal to the citizen who submitted it, so never cache API responses.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
