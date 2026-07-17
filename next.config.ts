import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Phosphor não está na lista default do optimizePackageImports, e o barrel
    // dele tem milhares de ícones — sem isto, cada import solto puxa o barrel
    // inteiro na build de dev.
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;
