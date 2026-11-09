import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Excluir paquetes nativos del bundling en el servidor
  // Turbopack usa serverExternalPackages; Webpack usa la opción externals en su config
  serverExternalPackages: ["serialport", "@prisma/client", "prisma"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Para el build de producción (Webpack) excluimos serialport manualmente
      config.externals = config.externals || [];
      config.externals.push("serialport");
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

// En producción activamos PWA (Workbox añade overhead al compilador en dev)
// En dev exportamos la config desnuda para máxima velocidad con Turbopack
let exportedConfig: NextConfig;

if (!isDev) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWA = require("next-pwa");
  const pwaConfig = withPWA({
    dest: "public",
    disable: isDev,
    register: true,
    skipWaiting: true,
  });
  exportedConfig = pwaConfig(nextConfig);
} else {
  exportedConfig = nextConfig;
}

export default exportedConfig;
