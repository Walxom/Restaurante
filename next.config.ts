import type { NextConfig } from "next";
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Excluir serialport del bundling de webpack
      config.externals = config.externals || [];
      config.externals.push('serialport');
    }
    return config;
  },
  serverExternalPackages: ['serialport'],
};

export default pwaConfig(nextConfig);
